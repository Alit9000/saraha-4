export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }

    req.body = value;
    next();
  };
}

export function requireFile(fieldName = "profileImage") {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} file is required`,
      });
    }

    next();
  };
}
