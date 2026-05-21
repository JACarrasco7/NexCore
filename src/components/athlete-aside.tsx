"use client";

import { useEffect, useState } from "react";
import { apiFetch } from '@/lib/store'
import Link from "next/link";
import { usePathname } from "next/navigation";

type AthleteProfile = {
  id: string;
  fullName: string;
  goal: string;
  phaseLabel: string;
  latestWeightKg: number | null;
  coachName?: string;
};

const goalLabels: Record<string, string> = {
  volumen: "Volumen",
  definicion: "Definición",
  mantenimiento: "Mantenimiento",
  "peak-week": "Peak Week",
};
const goalTones: Record<string, string> = {
  volumen: "text-success",
  definicion: "text-warning",
  mantenimiento: "text-foreground/50",
  "peak-week": "text-danger",
};

const NAV_LINKS = [
  { href: "/athlete",              label: "Dashboard",   icon: "⚡" },
  { href: "/athlete/plan",         label: "Rutinas",     icon: "🏋️" },
  { href: "/athlete/nutrition",    label: "Nutrición",   icon: "🥗" },
  { href: "/athlete/training-log", label: "Registro",    icon: "📝" },
  { href: "/athlete/daily-log",    label: "Diario",      icon: "📊" },
  { href: "/athlete/check-in",     label: "Check-in",    icon: "✅" },
  { href: "/athlete/chat",         label: "Chat coach",  icon: "💬" },
];

export function AthleteAside() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    apiFetch<AthleteProfile>('/api/me/athlete')
      .then((d) => { if (d) setProfile(d as AthleteProfile); })
      .catch(() => {});
  }, []);

  if (!profile) return null;

  return (
    <aside className="hidden xl:flex xl:flex-col xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-88px)] w-[220px] shrink-0 gap-3 overflow-y-auto pb-6">
      {/* Identity */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{profile.fullName}</p>
            {profile.coachName && (
              <p className="truncate text-xs text-foreground/40">Coach: {profile.coachName}</p>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className={`text-xs font-medium ${goalTones[profile.goal] ?? "text-foreground/50"}`}>
            {goalLabels[profile.goal] ?? profile.goal}
          </span>
          <span className="text-xs text-foreground/30">·</span>
          <span className="text-xs text-foreground/45 truncate">{profile.phaseLabel}</span>
        </div>
        {profile.latestWeightKg != null && (
          <div className="mt-2 rounded-xl bg-surface-strong px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/35">Peso</p>
            <p className="text-lg font-bold leading-tight">{profile.latestWeightKg} <span className="text-xs font-normal text-foreground/45">kg</span></p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="rounded-2xl border border-line bg-surface p-2 shadow-sm">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== "/athlete" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/65 hover:bg-surface-strong hover:text-foreground"
              }`}
            >
              <span className="shrink-0 text-xs">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
