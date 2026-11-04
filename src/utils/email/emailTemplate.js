export function emailTemplate({ name, otp, purpose, minutes }) {
  const action =
    purpose === "reset-password"
      ? "Use this code to reset your password."
      : "Use this code to confirm your email address.";

  return `Hello ${name || "there"},\n\n${action}\n\nYour code: ${otp}\n\nThis code expires in ${minutes} minutes.\n\nIf you did not request this code, you can ignore this email.`;
}
