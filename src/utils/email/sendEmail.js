import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "Email configuration is missing in config/.env (EMAIL_HOST, EMAIL_USER, EMAIL_PASS)"
    );
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

export async function sendEmail(to, subject, text) {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
}
