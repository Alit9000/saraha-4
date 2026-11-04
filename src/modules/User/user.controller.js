import express from "express";
import { auth } from "../../middlewares/auth.middleware.js";
import {
  validate,
  requireFile,
} from "../../middlewares/validation.middleware.js";
import { uploadProfileImage } from "../../utils/multer.js";
import { successResponse } from "../../utils/success.res.js";
import {
  registerSchema,
  confirmEmailSchema,
  loginSchema,
  refreshTokenSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from "./user.validation.js";
import {
  registerService,
  confirmEmailService,
  loginService,
  refreshTokenService,
  forgetPasswordService,
  resetPasswordService,
  getProfileService,
  updateProfileImageService,
} from "./user.service.js";

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

async function register(req, res) {
  const data = await registerService(req.body);

  return successResponse(
    res,
    201,
    "Registration successful. Check your email for the confirmation OTP.",
    data
  );
}

async function confirmEmail(req, res) {
  const data = await confirmEmailService(req.body);

  return successResponse(res, 200, "Email confirmed successfully.", data);
}

async function login(req, res) {
  const data = await loginService(req.body);

  return successResponse(res, 200, "Login successful.", data);
}

async function refreshToken(req, res) {
  const data = await refreshTokenService(req.body.refreshToken);

  return successResponse(res, 200, "Access token refreshed successfully.", data);
}

async function forgetPassword(req, res) {
  const { message } = await forgetPasswordService(req.body);

  return successResponse(res, 200, message);
}

async function resetPassword(req, res) {
  const { message } = await resetPasswordService(req.body);

  return successResponse(res, 200, message);
}

async function getMe(req, res) {
  const data = await getProfileService(req.user.id);

  return successResponse(res, 200, "Profile fetched successfully.", data);
}

async function updateProfileImageHandler(req, res) {
  const profileImage = `uploads/${req.file.filename}`;
  const data = await updateProfileImageService(req.user.id, profileImage);

  return successResponse(res, 200, "Profile image uploaded successfully.", data);
}

// Public routes
router.post("/register", validate(registerSchema), asyncHandler(register));
router.post(
  "/confirm-email",
  validate(confirmEmailSchema),
  asyncHandler(confirmEmail)
);
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  asyncHandler(refreshToken)
);
router.post(
  "/forget-password",
  validate(forgetPasswordSchema),
  asyncHandler(forgetPassword)
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(resetPassword)
);

// Protected routes
router.get("/me", auth, asyncHandler(getMe));
router.patch(
  "/profile-image",
  auth,
  uploadProfileImage,
  requireFile("profileImage"),
  asyncHandler(updateProfileImageHandler)
);

export default router;
