import crypto from "node:crypto";
import nodemailer from "nodemailer";

export function createAuthToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return { rawToken, tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex") };
}

export function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export async function sendAuthEmail(to: string, subject: string, url: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    if (process.env.NODE_ENV !== "production") console.info(`[auth] ${subject}: ${url}`);
    return;
  }

  await getMailer().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: `${subject}\n\n${url}`,
    html: `<p>${subject}</p><p><a href="${url}">${url}</a></p>`,
  });
}
