"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTrainingPlans, useSessionLogs } from "@/lib/store";
import { useAthleteMe } from "@/lib/use-athlete-me";
import { TECHNIQUE_LABELS } from "@/lib/domain";
import type { HighIntensityTechnique, TrainingPlan } from "@/lib/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { AthleteAside } from "@/components/athlete-aside";

const TECH_COLORS: Record<string, string> = {
  drop_set:   "bg-red-900/30 text-red-300 border-red-700/40",
  rest_pause: "bg-amber-900/30 text-amber-300 border-amber-700/40",
  myo_reps:   "bg-violet-900/30 text-violet-300 border-violet-700/40",
  super_set:  "bg-emerald-900/30 text-emerald-300 border-emerald-700/40",
  giant_set:  "bg-emerald-900/30 text-emerald-300 border-emerald-700/40",
  cluster:    "bg-amber-900/30 text-amber-300 border-amber-700/40",
  tempo:      "bg-slate-700/30 text-slate-300 border-slate-600/40",
  pre_fatiga: "bg-red-900/30 text-red-300 border-red-700/40",
  eccentrico: "bg-slate-700/30 text-slate-300 border-slate-600/40",
  isometrico: "bg-slate-700/30 text-slate-300 border-slate-600/40",
  amrap:      "bg-red-900/30 text-red-300 border-red-700/40",
};

function PlanCard({ plan, loggedSessionIds }: { plan: TrainingPlan; loggedSessionIds: Set<string> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-4xl border border-line bg-surface-strong">
      {/* Plan header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-accent-soft"
      >
        <div>
          <p className="font-bold text-foreground">{plan.title}</p>
          <p className="mt-0.5 text-xs text-foreground/50">{plan.weekLabel} · {plan.sessions.length} sesiones</p>
        </div>
        <span className="shrink-0 text-foreground/40">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-line px-6 pb-6 pt-4 space-y-3">
          {plan.sessions.map((session) => {
            const done = loggedSessionIds.has(session.id);
            return (
              <details key={session.id} className="group">
                <summary className={`flex cursor-pointer select-none items-center justify-between rounded-2xl border px-4 py-3 text-sm transition hover:bg-white/5 ${
                  done ? "border-success/30 bg-success/8" : "border-line bg-surface"
                }`}>
                  <div className="flex items-center gap-3">
                    {done && <span className="text-success text-base">✓</span>}
                    <div>
                      <span className="font-semibold">{session.name}</span>
                      <span className="ml-2 text-xs text-foreground/50">{session.exercises.length} ejercicios</span>
                    </div>
                  </div>
                  <Link
                    href="/athlete/training-log"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs transition hover:border-accent/40 hover:text-accent"
                  >
                    Entrenar
                  </Link>
                </summary>

                <div className="mt-2 space-y-2 pl-2">
                  {session.exercises.map((ex, ei) => {
                    const techKey = ex.technique as HighIntensityTechnique;
                    const techColor = TECH_COLORS[techKey] ?? "bg-slate-700/30 text-slate-300 border-slate-600/40";
                    const hasTempoFull = ex.tempoEcc && ex.tempoConc;
                    const tempoStr = hasTempoFull ? `${ex.tempoEcc}-${ex.tempoPause ?? 0}-${ex.tempoConc}` : null;

                    return (
                      <div key={ei} className="rounded-xl border border-line bg-surface p-3 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">{ex.exercise}</span>
                          {ex.technique && (
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${techColor}`}>
                              {TECHNIQUE_LABELS[techKey] ?? ex.technique}
                            </span>
                          )}
                          {ex.videoUrl && (
                            <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                              className="ml-auto text-violet-400 hover:underline shrink-0">Demo</a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-foreground/70">
                          <span className="rounded bg-accent-soft px-2 py-0.5 font-mono font-semibold text-accent">
                            {ex.sets} × {ex.reps}
                          </span>
                          {ex.targetRir !== undefined && (
                            <span className="rounded bg-surface-strong border border-line px-2 py-0.5">RIR {ex.targetRir}</span>
                          )}
                          {ex.loadKg && (
                            <span className="rounded bg-surface-strong border border-line px-2 py-0.5">
                              {ex.loadKg} kg{ex.loadNote ? ` · ${ex.loadNote}` : ""}
                            </span>
                          )}
                          {tempoStr && (
                            <span className="rounded bg-surface-strong border border-line px-2 py-0.5 font-mono">Tempo {tempoStr}</span>
                          )}
                          {ex.restSeconds && (
                            <span className="rounded bg-surface-strong border border-line px-2 py-0.5">{ex.restSeconds}s</span>
                          )}
                        </div>

                        {ex.coachCue && (
                          <div className="rounded-xl border border-accent/20 bg-accent-soft px-3 py-2 italic text-foreground/65">
                            &ldquo;{ex.coachCue}&rdquo;
                          </div>
                        )}
                        {ex.progressionNote && (
                          <div className="rounded-xl border border-success/30 bg-success/8 px-3 py-2 text-success">
                            📈 {ex.progressionNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyPlanPage() {
  const { athlete, loading, notFound } = useAthleteMe();
  const { plans, loading: loadingPlans } = useTrainingPlans(athlete?.id);
  const { logs } = useSessionLogs(athlete?.id);

  const loggedSessionIds = new Set(logs.map((l) => l.sessionId));

  // Sort: most recent plan first
  const sortedPlans = [...plans].sort(
    (a, b) => parseInt(b.id.slice(-5), 36) - parseInt(a.id.slice(-5), 36)
  );
  const activePlan = sortedPlans[0] ?? null;

  if (loading || loadingPlans) {
    return (
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        <Skeleton className="h-4 w-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </main>
    );
  }

  if (notFound || !athlete) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <p className="text-xl font-semibold">Sin perfil de atleta</p>
        <Link href="/athlete/onboarding"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
          Completar onboarding
        </Link>
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-6 py-8 md:px-10 lg:px-12">
      <main className="flex-1 min-w-0 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground/50">Hola, {athlete.fullName.split(" ")[0]}</p>
          <h1 className="mt-1 text-3xl font-bold">Tu rutina activa</h1>
          <p className="mt-1 text-sm text-foreground/50">{athlete.phaseLabel}</p>
        </div>
        <Link
          href="/athlete/training-log"
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          Entrenar ahora
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-3xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold">{plans.length}</p>
          <p className="mt-0.5 text-xs text-foreground/50">rutinas</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="mt-0.5 text-xs text-foreground/50">sesiones completadas</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold">{activePlan?.sessions.length ?? 0}</p>
          <p className="mt-0.5 text-xs text-foreground/50">sesiones en rutina activa</p>
        </div>
      </div>

      {/* No plan */}
      {plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-4xl border border-line bg-surface py-16 text-center">
          <p className="text-xl font-semibold">Sin rutina asignada</p>
          <p className="text-sm text-foreground/60">Tu coach todavía no ha importado ninguna rutina.</p>
        </div>
      )}

      {/* Active plan */}
      {activePlan && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground/70">Rutina activa</h2>
          <PlanCard plan={activePlan} loggedSessionIds={loggedSessionIds} />
        </section>
      )}

      {/* Older plans */}
      {sortedPlans.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground/40">Rutinas anteriores</h2>
          {sortedPlans.slice(1).map((plan) => (
            <PlanCard key={plan.id} plan={plan} loggedSessionIds={loggedSessionIds} />
          ))}
        </section>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Link href="/athlete/daily-log"
          className="rounded-3xl border border-line bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-strong">
          <p className="font-semibold">Registro diario</p>
          <p className="mt-0.5 text-xs text-foreground/50">Peso, pasos, sueño y medidas del día.</p>
        </Link>
        <Link href="/athlete/check-in"
          className="rounded-3xl border border-line bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-strong">
          <p className="font-semibold">Check-in</p>
          <p className="mt-0.5 text-xs text-foreground/50">Revisión periódica de adherencia y sensaciones.</p>
        </Link>
        <Link href="/athlete/training-log"
          className="rounded-3xl border border-line bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-strong">
          <p className="font-semibold">Registrar sesión</p>
          <p className="mt-0.5 text-xs text-foreground/50">Anota series, carga y RIR de la sesión de hoy.</p>
        </Link>
        <Link href="/athlete/gym-machines"
          className="rounded-3xl border border-line bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-strong">
          <p className="font-semibold">Maquinaria del gym</p>
          <p className="mt-0.5 text-xs text-foreground/50">Carga tus máquinas para que el coach adapte ejercicios.</p>
        </Link>
      </div>
      </main>
      <AthleteAside />
    </div>
  );
}
