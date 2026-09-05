import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  return Response.json({
    ok: db === "up",
    service: "eduverse-telehealth",
    version: process.env.APP_VERSION ?? "1.0.0",
    commit: process.env.APP_COMMIT || undefined,
    db,
    time: new Date().toISOString(),
  }, { status: db === "up" ? 200 : 503 });
}
