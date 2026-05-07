"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-surface-strong" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="rounded-full border border-line bg-surface-strong px-4 py-1.5 text-xs font-medium transition hover:border-accent/40"
      >
        Iniciar sesion
      </button>
    );
  }

  const initials = (session.user.name ?? session.user.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const role = (session.user as { role?: string }).role;
  const roleLabel = role === "COACH" ? "Coach" : role === "ADMIN" ? "Admin" : "Atleta";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden flex-col items-end md:flex">
        <span className="text-xs font-medium leading-none">{session.user.name ?? session.user.email}</span>
        <span className="mt-0.5 text-[10px] text-foreground/50">{roleLabel}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Cerrar sesión"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-accent to-accent-strong text-xs font-bold text-white shadow-[0_2px_10px_var(--accent-glow)] transition hover:shadow-[0_4px_16px_var(--accent-glow)]"
      >
        {initials}
      </button>
    </div>
  );
}
