"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AthleteDashboard } from "@/components/athlete-dashboard";

type AthleteProfile = {
  id: string;
  fullName: string;
  goal: string;
  phaseLabel: string;
  latestWeightKg: number | null;
  coachName?: string;
  nextCheckInDate?: string | null;
  currentStreak?: number | null;
  emailVerified?: string | null;
};

const goalLabels: Record<string, string> = {
  volumen: "Volumen",
  definicion: "Definición",
  mantenimiento: "Mantenimiento",
  "peak-week": "Peak Week",
};
const goalTones: Record<string, string> = {
  volumen: "bg-success/15 text-success",
  definicion: "bg-warning/15 text-warning",
  mantenimiento: "bg-foreground/10 text-foreground/60",
  "peak-week": "bg-danger/15 text-danger",
};

function AthleteAside({ profile }: { profile: AthleteProfile }) {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:sticky xl:top-24 xl:self-start xl:h-[calc(100vh-120px)] w-[260px] shrink-0 gap-3 overflow-y-auto pb-6 pl-6 pt-8 md:pl-10 lg:pl-12">
      {/* Identity card */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-lg font-bold text-accent">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.fullName}</p>
            {profile.coachName && (
              <p className="text-xs text-foreground/45">Coach: {profile.coachName}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goalTones[profile.goal] ?? "bg-foreground/10 text-foreground/60"}`}>
            {goalLabels[profile.goal] ?? profile.goal}
          </span>
          <span className="rounded-full bg-foreground/8 px-2.5 py-1 text-xs text-foreground/55">
            {profile.phaseLabel}
          </span>
        </div>
        {profile.latestWeightKg != null && (
          <div className="mt-3 rounded-xl bg-surface-strong p-3">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">Último peso</p>
            <p className="text-xl font-bold">{profile.latestWeightKg} <span className="text-sm font-normal text-foreground/50">kg</span></p>
          </div>
        )}
      </div>

      {/* Racha */}
      {profile.currentStreak != null && (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40">Racha activa</p>
          <p className="mt-1 text-3xl font-bold text-accent">{profile.currentStreak} <span className="text-sm font-normal text-foreground/50">semanas</span></p>
        </div>
      )}

      {/* Próximo check-in */}
      {profile.nextCheckInDate && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-[10px] uppercase tracking-widest text-accent/70">Próximo check-in</p>
          <p className="mt-1 text-sm font-semibold">
            {new Date(profile.nextCheckInDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <Link href="/athlete/check-in" className="mt-3 flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition">
            Hacer check-in →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <p className="mb-2 px-1 text-[10px] uppercase tracking-widest text-foreground/40">Accesos rápidos</p>
        {[
          { href: "/athlete/training-log", label: "Registrar sesión" },
          { href: "/athlete/daily-log", label: "Log diario" },
          { href: "/athlete/nutrition/log", label: "Registrar comida" },
          { href: "/athlete/chat", label: "Hablar con coach" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-surface-strong hover:text-foreground">
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default function AthleteDashboardPage() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [sendingVerif, setSendingVerif] = useState(false);
  const [verifSent, setVerifSent] = useState(false);

  useEffect(() => {
    fetch("/api/me/athlete")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setProfile(d as AthleteProfile);
      })
      .catch(() => {});
  }, []);

  async function handleSendVerification() {
    setSendingVerif(true);
    try {
      await fetch("/api/auth/send-verification", { method: "POST" });
      setVerifSent(true);
    } finally {
      setSendingVerif(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] xl:gap-6">
      {profile && <AthleteAside profile={profile} />}
      <div className="min-w-0 flex-1">
        {profile && !profile.emailVerified && (
          <div className="mx-6 mt-6 rounded-2xl border border-warning/40 bg-warning/8 px-4 py-3 text-sm md:mx-10 lg:mx-12">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-warning font-medium">
                ⚠️ Email sin verificar — confirma tu dirección para proteger tu cuenta.
              </p>
              {verifSent ? (
                <span className="text-xs text-success font-medium">✓ Email enviado</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSendVerification()}
                  disabled={sendingVerif}
                  className="rounded-full border border-warning/50 px-3 py-1 text-xs font-semibold text-warning transition hover:bg-warning/10 disabled:opacity-50"
                >
                  {sendingVerif ? "Enviando…" : "Enviar verificación"}
                </button>
              )}
            </div>
          </div>
        )}
        <AthleteDashboard />
      </div>
    </div>
  );
}
