"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { UserMenu } from "@/components/user-menu";
import { FloatingChat } from "@/components/floating-chat";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

const COACH_ROUTES = [
  { href: "/coach",                label: "Dashboard",   icon: "⚡" },
  { href: "/coach/athletes",       label: "Atletas",     icon: "👥" },
  { href: "/coach/wall",           label: "Muro",        icon: "📣" },
  { href: "/coach/service-plans",  label: "Planes",      icon: "💎" },
  { href: "/coach/posing-lab",     label: "Posing Lab",  icon: "🎬" },
  { href: "/coach/import-lab",     label: "CSV",         icon: "📥" },
  { href: "/coach/settings",       label: "Catálogo",    icon: "⚙️" },
  { href: "/athlete/training-log", label: "Registrar",  icon: "➕" },
  { href: "/athlete/check-in",     label: "Check-in",   icon: "✅" },
];

const ATHLETE_ROUTES = [
  { href: "/athlete",              label: "Dashboard",  icon: "⚡" },
  { href: "/athlete/plan",         label: "Rutinas",    icon: "🏋️" },
  { href: "/athlete/nutrition",    label: "Nutrición",  icon: "🥗" },
  { href: "/athlete/training-log", label: "Registro",   icon: "📝" },
  { href: "/athlete/daily-log",    label: "Diario",     icon: "📊" },
  { href: "/athlete/check-in",     label: "Check-in",   icon: "✅" },
  { href: "/athlete/wall",         label: "Muro",       icon: "📣" },
];

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;
  const routes = role === "COACH" || role === "ADMIN" ? COACH_ROUTES : ATHLETE_ROUTES;

  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Verificar si tiene perfil completo → redirigir a /onboarding si no
  useEffect(() => {
    if (!session?.user || pathname.startsWith("/onboarding") || pathname.startsWith("/login") || pathname.startsWith("/register")) return;
    fetch("/api/me/profile-status")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { hasProfile: boolean; role: string } | null) => {
        if (d && !d.hasProfile) router.push("/onboarding");
      })
      .catch(() => {});
  }, [session?.user, pathname, router]);

  // Poll unread count cada 15 s
  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    async function refresh() {
      const r = await fetch("/api/messages/unread-count").catch(() => null);
      if (r?.ok && active) {
        const d = await r.json() as { count: number };
        setUnread(d.count);
      }
    }
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => { active = false; clearInterval(id); };
  }, [session?.user]);

  // Cerrar menú al clicar fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function NavLink({ route }: { route: (typeof COACH_ROUTES)[number] }) {
    const active = pathname === route.href || (route.href !== "/" && pathname.startsWith(route.href) && route.href.length > 1);
    return (
      <Link
        href={route.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
          active
            ? "border-accent/40 bg-accent/12 text-accent shadow-[0_0_12px_var(--accent-glow)]"
            : "border-transparent text-foreground/70 hover:border-line hover:bg-surface hover:text-foreground"
        }`}
      >
        <span className="text-xs leading-none">{route.icon}</span>
        {route.label}
      </Link>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-xl">
        {/* accent top line */}
        <div className="h-0.5 w-full bg-linear-to-r from-transparent via-accent to-transparent opacity-60" />
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-6 px-6 py-3 md:px-10 lg:px-12">
          <Link href={role === "COACH" || role === "ADMIN" ? "/coach" : "/athlete"} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-accent to-accent-strong text-xs font-bold text-white shadow-[0_4px_14px_var(--accent-glow)]">
              AC
            </span>
            <div>
              <p className="text-base font-semibold text-accent">Apex Coach OS</p>
              <p className="text-xs text-foreground/50">{role === "COACH" || role === "ADMIN" ? "Coach workspace" : "Athlete view"}</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {routes.map((route) => (
              <NavLink key={route.href} route={route} />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Hamburger — visible en < lg */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface transition hover:bg-surface-strong lg:hidden"
            >
              <span className="sr-only">Menú</span>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="0" y1="1" x2="18" y2="1" />
                <line x1="0" y1="7" x2="18" y2="7" />
                <line x1="0" y1="13" x2="18" y2="13" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {(role === "COACH" || role === "ADMIN") && <NotificationBell />}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div id="mobile-nav-drawer" ref={menuRef} className="absolute inset-x-0 top-full z-30 border-b border-line bg-background/97 backdrop-blur-xl lg:hidden">
            <nav className="mx-auto flex w-full max-w-[1480px] flex-col gap-1 px-6 py-4 md:px-10">
              {routes.map((route) => {
                const active = pathname === route.href || (route.href !== "/" && pathname.startsWith(route.href) && route.href.length > 1);
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition ${
                      active
                        ? "bg-accent/12 text-accent"
                        : "text-foreground/70 hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{route.icon}</span>
                    {route.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {children}

      <footer className={`mt-auto border-t border-line ${pathname.startsWith("/coach") || pathname.startsWith("/athlete") ? "" : ""}`}>
        <div className={`mx-auto flex w-full max-w-[1480px] items-center justify-between gap-2 px-6 text-xs text-foreground/45 md:px-10 lg:px-12 ${pathname.startsWith("/coach") || pathname.startsWith("/athlete") ? "py-2" : "py-5 flex-col lg:flex-row"}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-linear-to-br from-accent to-accent-strong text-[9px] font-bold text-white">AC</span>
            <span>Apex Coach OS · MVP v0.1</span>
          </div>
          {!(pathname.startsWith("/coach") || pathname.startsWith("/athlete")) && (
            <p>Coach-athlete workflow · Next.js + Prisma + NextAuth</p>
          )}
        </div>
      </footer>

      {/* Burbuja de chat flotante — visible para todos los roles autenticados */}
      {session?.user && <FloatingChat unread={unread} />}
    </div>
  );
}

