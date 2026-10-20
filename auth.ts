import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { createHash } from "node:crypto";
import type { ClinicianCredential, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { logError, logInfo } from "@/lib/logger";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      credential: ClinicianCredential | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    credential: ClinicianCredential | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    credential?: ClinicianCredential | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) {
          logInfo({ event: "login_rejected" });
          return null;
        }
        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          logInfo({ event: "login_rejected" });
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credential: user.credential,
        };
      },
    }),
    Credentials({
      id: "magic-link",
      name: "Magic link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        const raw = String(credentials?.token ?? "").trim();
        if (!raw) return null;
        const hashed = createHash("sha256").update(raw).digest("hex");
        const record = await prisma.verificationToken.findUnique({ where: { token: hashed } });
        if (!record || record.expires < new Date()) {
          logInfo({ event: "magic_link_rejected" });
          return null;
        }
        await prisma.verificationToken.delete({
          where: { identifier_token: { identifier: record.identifier, token: record.token } },
        });
        const user = await prisma.user.findUnique({ where: { email: record.identifier } });
        if (!user || !user.active) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credential: user.credential,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.credential = user.credential;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | undefined) ?? "AUDITOR";
        session.user.credential = (token.credential as ClinicianCredential | null | undefined) ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await writeAudit({
          actorId: user.id,
          action: "AUTH_LOGIN",
          entityType: "user",
          entityId: user.id,
        });
        logInfo({ event: "login_ok", actorId: user.id });
      }
    },
  },
  logger: {
    error(error) {
      logError({ event: "auth_error", errorCode: error.name });
    },
  },
});
