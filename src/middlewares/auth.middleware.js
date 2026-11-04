import jwt from "jsonwebtoken";
import { User } from "../DB/models/user.model.js";

export async function auth(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Access token is required",
    });
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Access token has expired"
        : "Invalid access token";

    return res.status(401).json({ success: false, message });
  }

  // A refresh token must never be accepted as an access token.
  if (decodedToken.type !== "access") {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
    });
  }

  try {
    const user = await User.findById(decodedToken.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (!user.isEmailConfirmed) {
      return res.status(403).json({
        success: false,
        message: "Please confirm your email before accessing this route",
      });
    }

    if (
      user.passwordChangedAt &&
      decodedToken.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return res.status(401).json({
        success: false,
        message: "Access token is no longer valid. Please log in again.",
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
