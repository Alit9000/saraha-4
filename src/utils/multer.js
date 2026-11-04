import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(currentDirectory, "../../uploads");

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function ensureUploadDirectory() {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

ensureUploadDirectory();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    ensureUploadDirectory();
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    // Ignore the original filename and build a safe unique name.
    const extension = extensionByMimeType[file.mimetype] || "";
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    callback(null, uniqueName);
  },
});

function fileFilter(req, file, callback) {
  if (extensionByMimeType[file.mimetype]) {
    return callback(null, true);
  }

  const error = new Error("Only JPG, JPEG, PNG, or WEBP image files are allowed");
  error.status = 400;
  callback(error);
}

export const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
}).single("profileImage");
