import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail, smtpConfigured } from "@/lib/mail";
import { jsonError } from "@/lib/session";
import { logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return jsonError("Email is required", 400);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, active: true } });
  // Always look successful to avoid account enumeration.
  if (!user?.active) {
    logInfo({ event: "magic_link_unknown" });
    return Response.json({ ok: true });
  }

  const raw = randomBytes(32).toString("hex");
  const hashed = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 20 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token: hashed, expires },
  });

  const origin = process.env.AUTH_URL ?? new URL(request.url).origin;
  const verifyUrl = `${origin}/login/verify?token=${raw}`;

  if (smtpConfigured()) {
    await sendMagicLinkEmail(email, verifyUrl);
  }

  const returnUrl = process.env.MAGIC_LINK_RETURN_URL === "true";
  return Response.json({
    ok: true,
    emailed: smtpConfigured(),
    verifyUrl: returnUrl ? verifyUrl : undefined,
  });
}
