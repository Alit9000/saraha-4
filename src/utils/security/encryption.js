import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hexadecimal characters in config/.env"
    );
  }

  return Buffer.from(key, "hex");
}

export function encrypt(plainText) {
  if (!plainText) return "";

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:cipherText (all hexadecimal)
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(encryptedText) {
  if (!encryptedText) return "";

  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted value");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
