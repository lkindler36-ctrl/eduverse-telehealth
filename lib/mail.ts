import nodemailer from "nodemailer";
import { logError, logInfo } from "@/lib/logger";

export function smtpConfigured() {
  return Boolean(process.env.EMAIL_SERVER?.trim());
}

export async function sendMagicLinkEmail(to: string, verifyUrl: string) {
  const server = process.env.EMAIL_SERVER?.trim();
  if (!server) {
    throw new Error("EMAIL_SERVER is not configured");
  }

  const transporter = nodemailer.createTransport(server);
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "EduVerse TeleHealth <noreply@vbhealthcare.org>",
      to,
      subject: "EduVerse TeleHealth sign-in link",
      text: `Use this link to sign in. It expires in 20 minutes.\n\n${verifyUrl}\n\nIf you did not request this, ignore this message.`,
      html: `<p>Use this link to sign in. It expires in 20 minutes.</p><p><a href="${verifyUrl}">Sign in to EduVerse TeleHealth</a></p><p>If you did not request this, ignore this message.</p>`,
    });
    logInfo({ event: "magic_link_sent" });
  } catch {
    logError({ event: "magic_link_send_failed" });
    throw new Error("Unable to send sign-in email");
  }
}
