export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    name: "eduverse-telehealth",
    version: process.env.APP_VERSION ?? "1.0.0",
    commit: process.env.APP_COMMIT || null,
    product: "EduVerse TeleHealth visit documentation",
    org: "Von & Bick Healthcare Associates, LLC",
  });
}
