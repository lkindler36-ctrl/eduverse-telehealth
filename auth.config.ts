import type { NextAuthConfig } from "next-auth";

const useSecureCookies = process.env.AUTH_URL?.startsWith("https://") ?? false;

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/login/verify" ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/api/version") ||
        pathname.startsWith("/api/auth")
      ) {
        return true;
      }
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
