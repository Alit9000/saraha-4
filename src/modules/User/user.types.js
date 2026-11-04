export const OTP_PURPOSES = Object.freeze({
  CONFIRM_EMAIL: "confirm-email",
  RESET_PASSWORD: "reset-password",
});

// OTPs expire after 5 minutes.
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_TTL_MINUTES = OTP_TTL_SECONDS / 60;
