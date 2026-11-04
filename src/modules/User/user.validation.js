import Joi from "joi";

const emailSchema = Joi.string().trim().lowercase().email().required().messages({
  "string.email": "email must be a valid email address",
  "any.required": "email is required",
});

const otpSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    "string.pattern.base": "otp must be a 6-digit code",
    "any.required": "otp is required",
  });

function passwordSchema(fieldName) {
  return Joi.string()
    .min(6)
    .max(72)
    .required()
    .messages({
      "string.min": `${fieldName} must be at least 6 characters`,
      "string.max": `${fieldName} must be at most 72 characters`,
      "any.required": `${fieldName} is required`,
    });
}

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required(),
  email: emailSchema,
  password: passwordSchema("password"),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "confirmPassword must match password",
      "any.required": "confirmPassword is required",
    }),
});

export const confirmEmailSchema = Joi.object({
  email: emailSchema,
  otp: otpSchema,
});

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    "any.required": "password is required",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "refreshToken is required",
  }),
});

export const forgetPasswordSchema = Joi.object({
  email: emailSchema,
});

export const resetPasswordSchema = Joi.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema("newPassword"),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "confirmPassword must match newPassword",
      "any.required": "confirmPassword is required",
    }),
});
