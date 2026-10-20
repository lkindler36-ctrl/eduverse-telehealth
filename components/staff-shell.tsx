import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/auth";
import { roleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { PhiBanner } from "@/components/phi-banner";
import type { SessionUser } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/caseload", label: "Caseload" },
  { href: "/visits", label: "Visits" },
  { href: "/search", label: "Search" },
];

export function StaffShell({
  user,
  pathname,
  children,
}: {
  user: SessionUser;
  pathname: string;
  children: ReactNode;
}) {
  const links = canSeeAudit(user)
    ? [...NAV, { href: "/audit", label: "Audit" }]
    : NAV;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PhiBanner />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none">EduVerse</span>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-muted sm:inline">
              TeleHealth
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-0.5">
            {links.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "flex h-10 shrink-0 items-center rounded-md bg-elevated px-3 text-sm"
                      : "flex h-10 shrink-0 items-center rounded-md px-3 text-sm text-muted hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 text-xs text-muted">
          <p>
            {user.name} · {roleLabel(user.role, user.credential)}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

function canSeeAudit(user: SessionUser) {
  return user.role === "ADMIN" || user.role === "AUDITOR";
}
