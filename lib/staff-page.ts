import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";

export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
