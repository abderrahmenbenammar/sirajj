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
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    if (process.env.NODE_ENV !== "production") console.info("[auth] SMTP not configured; skipping send");
    throw new Error("SMTP configuration is incomplete (missing host, user, password, or from)");
  }

  await getMailer().sendMail({
    from,
    to,
    subject,
    text: `${subject}\n\n${url}`,
    html: `<p>${subject}</p><p><a href="${url}">${url}</a></p>`,
  });
}
