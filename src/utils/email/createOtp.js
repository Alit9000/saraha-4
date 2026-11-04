import crypto from "node:crypto";

export function createOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}
