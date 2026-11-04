import express from "express";
import { connectDB } from "./DB/DB.connection.js";
import { connectRedis } from "./utils/redis-services.js";
import userRouter from "./modules/User/user.controller.js";

function sendError(res, statusCode, message, errors) {
  const body = {
    success: false,
    message,
  };

  if (errors) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}

export async function bootstrap() {
  await connectDB();
  await connectRedis();

  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/users", userRouter);

  app.use((req, res) => {
    return sendError(res, 404, "Route not found");
  });

  app.use((error, req, res, next) => {
    if (error.name === "MulterError") {
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendError(
          res,
          413,
          "Image is too large. Maximum size is 2 MB."
        );
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return sendError(
          res,
          400,
          'Unexpected file field. Use the "profileImage" field.'
        );
      }

      return sendError(res, 400, "File upload failed.");
    }

    if (error.type === "entity.parse.failed") {
      return sendError(res, 400, "Invalid JSON body.");
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((item) => item.message);
      return sendError(res, 400, "Validation failed.", errors);
    }

    if (error.code === 11000) {
      return sendError(res, 409, "Email is already registered.");
    }

    if (error.name === "VersionError") {
      return sendError(
        res,
        409,
        "This user was updated by another request. Please try again."
      );
    }

    const statusCode = error.status || 500;

    if (statusCode >= 500) {
      console.error("Unhandled error:", error.message);
    }

    return sendError(
      res,
      statusCode,
      statusCode >= 500 ? "Internal server error" : error.message
    );
  });

  return app;
}
