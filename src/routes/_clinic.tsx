import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCareStore } from "@/lib/eduverse/store";

export const Route = createFileRoute("/_clinic")({ component: CareLayout });

const NAV = [
  { to: "/", label: "Clinic", exact: true },
  { to: "/care", label: "Care" },
  { to: "/assistants", label: "Assistants" },
  { to: "/visit", label: "Visit" },
  { to: "/support", label: "Support" },
  { to: "/recruit", label: "Recruit" },
] as const;

function CareLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrate = useCareStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none">EduVerse</span>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-muted sm:inline">
              TeleHealth
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-0.5">
            {NAV.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === "/" || pathname === ""
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 shrink-0 items-center rounded-md px-3 text-sm",
                    active ? "bg-elevated text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
