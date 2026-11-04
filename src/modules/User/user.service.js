import jwt from "jsonwebtoken";
import { User } from "../../DB/models/user.model.js";
import { hashPassword, comparePassword } from "../../utils/security/hash.js";
import { encrypt, decrypt } from "../../utils/security/encryption.js";
import { createOtp } from "../../utils/email/createOtp.js";
import { emailTemplate } from "../../utils/email/emailTemplate.js";
import { sendEmail } from "../../utils/email/sendEmail.js";
import { setOtp, getOtp, deleteOtp } from "../../utils/redis-services.js";
import {
  OTP_PURPOSES,
  OTP_TTL_SECONDS,
  OTP_TTL_MINUTES,
} from "./user.types.js";

function httpError(statusCode, message) {
  const error = new Error(message);
  error.status = statusCode;
  return error;
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    isEmailConfirmed: user.isEmailConfirmed,
    createdAt: user.createdAt,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );
}

async function saveUser(user) {
  try {
    await user.save();
  } catch (error) {
    if (error.name === "VersionError") {
      throw httpError(
        409,
        "This user was updated by another request. Please try again."
      );
    }

    throw error;
  }
}

async function sendOtpEmail(user, purpose) {
  const otp = createOtp();

  // The OTP is encrypted before it is stored in Redis.
  await setOtp(user.email, purpose, encrypt(otp), OTP_TTL_SECONDS);

  const subject =
    purpose === OTP_PURPOSES.RESET_PASSWORD
      ? "Reset your Saraha password"
      : "Confirm your Saraha email";

  try {
    await sendEmail(
      user.email,
      subject,
      emailTemplate({
        name: user.name,
        otp,
        purpose,
        minutes: OTP_TTL_MINUTES,
      })
    );
  } catch (error) {
    await deleteOtp(user.email, purpose).catch(() => {});
    throw error;
  }
}

async function verifyOtp(purpose, email, submittedOtp) {
  const storedEncryptedOtp = await getOtp(email, purpose);

  if (!storedEncryptedOtp) {
    throw httpError(400, "Invalid or expired OTP");
  }

  let storedOtp;

  try {
    storedOtp = decrypt(storedEncryptedOtp);
  } catch (error) {
    await deleteOtp(email, purpose).catch(() => {});
    throw httpError(400, "Invalid or expired OTP");
  }

  if (storedOtp !== submittedOtp) {
    throw httpError(400, "Invalid or expired OTP");
  }

  // One-time use: remove the OTP immediately after successful verification.
  await deleteOtp(email, purpose);
}

export async function registerService({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw httpError(409, "Email is already registered");
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  try {
    await sendOtpEmail(user, OTP_PURPOSES.CONFIRM_EMAIL);
  } catch (error) {
    // Keep the database consistent if the confirmation email cannot be sent.
    await User.deleteOne({ _id: user._id }).catch(() => {});
    console.error("Could not send confirmation email:", error.message);
    throw httpError(
      500,
      "Registration could not be completed because the confirmation email was not sent. Please try again later."
    );
  }

  return { user: safeUser(user) };
}

export async function confirmEmailService({ email, otp }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw httpError(400, "Invalid or expired OTP");
  }

  if (user.isEmailConfirmed) {
    throw httpError(400, "Email is already confirmed");
  }

  await verifyOtp(OTP_PURPOSES.CONFIRM_EMAIL, normalizedEmail, otp);

  user.isEmailConfirmed = true;
  await saveUser(user);

  return { user: safeUser(user) };
}

export async function loginService({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw httpError(401, "Invalid email or password");
  }

  const passwordMatches = await comparePassword(password, user.password);

  if (!passwordMatches) {
    throw httpError(401, "Invalid email or password");
  }

  if (!user.isEmailConfirmed) {
    throw httpError(403, "Please confirm your email before logging in");
  }

  return {
    user: safeUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function refreshTokenService(refreshToken) {
  let decodedToken;

  try {
    decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw httpError(401, "Invalid or expired refresh token");
  }

  if (decodedToken.type !== "refresh") {
    throw httpError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedToken.id);

  if (!user) {
    throw httpError(401, "Invalid refresh token");
  }

  if (!user.isEmailConfirmed) {
    throw httpError(403, "Please confirm your email before logging in");
  }

  if (
    user.passwordChangedAt &&
    decodedToken.iat * 1000 < user.passwordChangedAt.getTime()
  ) {
    throw httpError(401, "Refresh token is no longer valid. Please log in again.");
  }

  return { accessToken: signAccessToken(user) };
}

export async function forgetPasswordService({ email }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Always return the same message so the response does not reveal whether
  // the email is registered.
  const message =
    "If this email is registered, a password reset code has been sent.";

  if (!user) {
    return { message };
  }

  try {
    await sendOtpEmail(user, OTP_PURPOSES.RESET_PASSWORD);
  } catch (error) {
    // Do not reveal email-sending or account details to the client.
    console.error("Could not send password reset email:", error.message);
  }

  return { message };
}

export async function resetPasswordService({ email, otp, newPassword }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw httpError(400, "Invalid or expired reset code");
  }

  await verifyOtp(OTP_PURPOSES.RESET_PASSWORD, normalizedEmail, otp);

  user.password = await hashPassword(newPassword);
  // JWT `iat` has second precision. Subtracting one second keeps a token
  // issued immediately after the reset valid, while older tokens are rejected.
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await saveUser(user);

  return {
    message: "Password reset successfully. Please log in with your new password.",
  };
}

export async function getProfileService(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw httpError(404, "User not found");
  }

  return { user: safeUser(user) };
}

export async function updateProfileImageService(userId, profileImage) {
  const user = await User.findById(userId);

  if (!user) {
    throw httpError(404, "User not found");
  }

  user.profileImage = profileImage;
  await saveUser(user);

  return { user: safeUser(user) };
}
