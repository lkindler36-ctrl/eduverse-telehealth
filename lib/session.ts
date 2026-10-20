import { auth } from "@/auth";
import type { ClinicianCredential, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  credential: ClinicianCredential | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !user.role) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "Staff",
    role: user.role,
    credential: user.credential ?? null,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const error = new Error("Unauthorized");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return user;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
