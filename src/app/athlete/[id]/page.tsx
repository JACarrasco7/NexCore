"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { apiFetch, apiPost, useCheckIns, useDailyLogs, useNutritionPlans, useSessionLogs } from "@/lib/store";
import type { AthleteProfile, SessionLog } from "@/lib/domain";
import { CoachAthleteDashboardSettings } from "@/components/coach-athlete-dashboard-settings";
import { DocumentPanel } from "@/components/document-panel";
import { Sparkline } from "@/components/sparkline";
import { Skeleton } from "@/components/ui/skeleton";

const GOAL_LABELS: Record<string, string> = {
  volumen: "Volumen",
  definicion: "Definicion",
  mantenimiento: "Mantenimiento",
  "peak-week": "Peak Week",
};

const GOAL_TONES: Record<string, string> = {
  volumen: "bg-success/10 text-success",
  definicion: "bg-warning/10 text-warning",
  mantenimiento: "bg-foreground/5 text-foreground/60",
  "peak-week": "bg-danger/10 text-danger",
};

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-4xl border border-line bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,0.05)] ${className}`.trim()}>{children}</article>;
}

function SummaryMetric({ label, value, detail, toneClass = "text-foreground" }: { label: string; value: string; detail: string; toneClass?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-foreground/45">{detail}</p>
    </div>
  );
}

function ActionCard({ href, label, detail, tone = "default" }: { href: string; label: string; detail: string; tone?: "default" | "primary"; }) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 flex-col justify-between rounded-3xl border px-4 py-4 text-left transition ${tone === "primary" ? "border-accent/35 bg-accent/10 text-foreground hover:bg-accent/14" : "border-line bg-surface text-foreground/75 hover:border-accent/25 hover:bg-surface-strong"}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-foreground/50">{detail}</span>
    </Link>
  );
}

function getMuscleGroup(exercise: string): string {
  const ex = exercise.toLowerCase();
  if (/(press banca|inclinado|aperturas|pecho|chest)/.test(ex)) return "Pecho";
  if (/(remo|jal[oó]n|dominada|pull|espalda|lat)/.test(ex)) return "Espalda";
  if (/(sentadilla|prensa|zancada|cu[aá]driceps|leg extension)/.test(ex)) return "Cuádriceps";
  if (/(peso muerto|curl femoral|isquio|hip thrust|gl[úu]teo)/.test(ex)) return "Isquios/Glúteo";
  if (/(press militar|elevaciones|hombro|deltoid)/.test(ex)) return "Hombro";
  if (/(curl|bíceps|biceps)/.test(ex)) return "Bíceps";
  if (/(tr[íi]ceps|fondos|extensi[oó]n tríceps|pushdown)/.test(ex)) return "Tríceps";
  if (/(ab wheel|planchas|crunch|core|abdominal)/.test(ex)) return "Core";
  return "Otros";
}

function useAthlete(id: string) {
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    apiFetch<AthleteProfile>(`/api/athletes/${id}`)
      .then((data) => { setAthlete(data); setLoading(false); })
      .catch((err) => {
        if (err?.message?.includes('403')) setForbidden(true);
        else setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  return { athlete, loading, notFound, forbidden };
}

function CoachNoteInline({ checkInId, initial }: { checkInId: string; initial?: string | null }) {
  const [note, setNote] = useState(initial ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPost(`/api/check-ins/${checkInId}`, { coachNote: note });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-accent/80">Nota del coach</p>
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        rows={2}
        placeholder="Escribe tu feedback al atleta..."
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {saved && <span className="text-xs text-success">✓ Guardado</span>}
      </div>
    </div>
  );
}

function ExerciseProgressChart({ logs, exercises }: { logs: SessionLog[]; exercises: string[] }) {
  const [selected, setSelected] = useState(exercises[0] ?? "");

  const progressData = useMemo(() => {
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted
      .map((log) => {
        const sets = log.sets.filter((s) => s.exercise === selected);
        if (sets.length === 0) return null;
        const maxLoad = Math.max(...sets.map((s) => s.loadKg));
        return { date: log.date.slice(0, 10), maxLoad };
      })
      .filter((d): d is { date: string; maxLoad: number } => d !== null);
  }, [logs, selected]);

  if (exercises.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {exercises.map((ex) => (
          <button
            key={ex}
            onClick={() => setSelected(ex)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              selected === ex
                ? "bg-accent text-white"
                : "border border-line text-foreground/60 hover:text-foreground"
            }`}
          >
            {ex}
          </button>
        ))}
      </div>

      {progressData.length >= 2 ? (
        <div className="rounded-xl bg-background/40 p-4">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-xs text-foreground/50">Carga máxima — {selected}</p>
              <p className="text-2xl font-bold text-foreground">
                {progressData[progressData.length - 1].maxLoad} kg
              </p>
            </div>
            {(() => {
              const diff = progressData[progressData.length - 1].maxLoad - progressData[0].maxLoad;
              const color = diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-foreground/40";
              return (
                <p className={`text-xs font-semibold ${color}`}>
                  {diff > 0 ? "+" : ""}{diff} kg vs inicio
                </p>
              );
            })()}
          </div>
          <Sparkline
            data={progressData.map((d) => d.maxLoad)}
            width={320}
            height={60}
            color="#22c55e"
            fill="rgba(34,197,94,0.12)"
          />
          <div className="mt-1 flex justify-between text-xs text-foreground/30">
            <span>{progressData[0].date}</span>
            <span>{progressData[progressData.length - 1].date}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-foreground/40">
          Necesita al menos 2 sesiones con &quot;{selected}&quot; para ver la progresión.
        </p>
      )}
    </div>
  );
}

export default function AthleteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { athlete, loading, notFound, forbidden } = useAthlete(id);
  const { checkIns } = useCheckIns(id);
  const { dailyLogs } = useDailyLogs(id);
  const { logs: sessionLogs } = useSessionLogs(id);
  const { activePlan: nutritionPlan } = useNutritionPlans(id);
  const [profileTab, setProfileTab] = useState<"resumen" | "progreso" | "musculos" | "historial">("resumen");
  const [metricTab, setMetricTab] = useState<"peso" | "adherencia" | "sueno" | "volumen">("peso");

  const checkInsDesc = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestCheckIn = checkInsDesc[0];
  const dailyWeight = dailyLogs
    .filter((d) => typeof d.weightKg === "number" && d.weightKg !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dailySleep = dailyLogs
    .filter((d) => typeof d.sleepHours === "number" && d.sleepHours !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dailyWaist = dailyLogs
    .filter((d) => typeof d.waistCm === "number" && d.waistCm !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dailyFat = dailyLogs
    .filter((d) => typeof d.bodyFatPct === "number" && d.bodyFatPct !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const muscleVolumeMap = sessionLogs
    .flatMap((log) => log.sets)
    .reduce<Record<string, number>>((acc, set) => {
      const group = getMuscleGroup(set.exercise);
      acc[group] = (acc[group] ?? 0) + set.loadKg * set.reps;
      return acc;
    }, {});
  const muscleVolumes = Object.entries(muscleVolumeMap)
    .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
  const topExercises = Object.entries(
    sessionLogs.flatMap((log) => log.sets).reduce<Record<string, number>>((acc, set) => {
      acc[set.exercise] = (acc[set.exercise] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([exercise, sets]) => ({ exercise, sets }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 8);
  const tabAvailability = {
    peso: dailyWeight.length >= 2,
    adherencia: checkIns.length >= 2,
    sueno: dailySleep.length >= 2,
    volumen: sessionLogs.length >= 2,
  };
  const adherenceColor =
    !latestCheckIn ? "text-foreground/40" :
    latestCheckIn.adherencePct >= 80 ? "text-success" :
    latestCheckIn.adherencePct >= 60 ? "text-warning" : "text-danger";

  useEffect(() => {
    if (tabAvailability[metricTab]) return;
    const firstAvailable = (["peso", "adherencia", "sueno", "volumen"] as const).find((k) => tabAvailability[k]);
    if (firstAvailable) setMetricTab(firstAvailable);
  }, [metricTab, tabAvailability.peso, tabAvailability.adherencia, tabAvailability.sueno, tabAvailability.volumen]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-2xl font-semibold">Sin acceso a este atleta</p>
        <p className="text-sm text-foreground/60">
          Solo el coach asignado, un admin o el propio atleta pueden abrir este perfil.
        </p>
        <Link href="/athlete/check-in" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
          Volver
        </Link>
      </main>
    );
  }

  if (notFound || !athlete) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-2xl font-semibold">Atleta no encontrado</p>
        <p className="text-sm text-foreground/60">
          El ID <code className="rounded bg-surface-strong px-2 py-0.5 text-xs">{id}</code> no existe.
        </p>
        <Link href="/coach/athletes" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
          Volver a atletas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground/50">
        <Link href="/coach" className="hover:text-foreground transition">Dashboard</Link>
        <span>/</span>
        <Link href="/coach/athletes" className="hover:text-foreground transition">Atletas</Link>
        <span>/</span>
        <span className="text-foreground">{athlete.fullName}</span>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-accent-soft text-2xl font-bold text-accent-strong">
                {athlete.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{athlete.fullName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${GOAL_TONES[athlete.goal] ?? "bg-surface text-foreground/60"}`}>
                    {GOAL_LABELS[athlete.goal] ?? athlete.goal}
                  </span>
                  <span className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs text-foreground/55">{athlete.phaseLabel}</span>
                  <span className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs text-foreground/55">Coach: {athlete.coachName}</span>
                </div>
              </div>
            </div>
            <Link
              href="/coach/athletes"
              className="shrink-0 rounded-full border border-line bg-surface-strong px-4 py-2 text-xs font-medium text-foreground/60 transition hover:border-accent/25 hover:bg-background"
            >
              ← Volver
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionCard href={`/athlete/training-log?athleteId=${id}`} label="Registrar sesión" detail="Carga entrenamiento del día" tone="primary" />
            <ActionCard href={`/athlete/daily-log?athleteId=${id}`} label="Registro diario" detail="Peso, sueño y pasos" />
            <ActionCard href={`/athlete/check-in?athleteId=${id}`} label="Check-in" detail="Revisión semanal del atleta" />
            <ActionCard href={`/coach/nutrition?athleteId=${id}`} label="Plan nutricional" detail="Ver o ajustar pauta actual" />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Lectura rápida</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="Sesiones" value={String(sessionLogs.length)} detail="completadas" />
            <SummaryMetric label="Diario" value={String(dailyLogs.length)} detail="registros capturados" />
            <SummaryMetric label="Check-ins" value={String(checkIns.length)} detail="historial disponible" />
            <SummaryMetric label="Adherencia" value={latestCheckIn ? `${latestCheckIn.adherencePct}%` : "—"} detail="ultimo check-in" toneClass={adherenceColor} />
          </div>
        </SurfaceCard>
      </section>

      <CoachAthleteDashboardSettings athleteId={id} />

      {/* Tabs del perfil (subpantallas reales) */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-4 shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "resumen", label: "Resumen" },
            { key: "progreso", label: "Progreso corporal" },
            { key: "musculos", label: "Grupos musculares" },
            { key: "historial", label: "Historial" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setProfileTab(tab.key as "resumen" | "progreso" | "musculos" | "historial")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                profileTab === tab.key
                  ? "bg-accent text-white"
                  : "border border-line bg-surface-strong text-foreground/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-foreground/40">Vista activa: {profileTab}</p>
      </section>

      {profileTab === "resumen" && (
      <>
      <SurfaceCard>
        <p className="text-xs text-foreground/50">Resumen rápido</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-line bg-surface-strong p-4">
            <p className="text-xs text-foreground/50">Último check-in</p>
            <p className="mt-1 text-sm font-semibold">{latestCheckIn ? latestCheckIn.weekLabel : "Sin check-ins"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-strong p-4">
            <p className="text-xs text-foreground/50">Último registro de peso</p>
            <p className="mt-1 text-sm font-semibold">{dailyWeight.at(-1)?.weightKg ? `${dailyWeight.at(-1)?.weightKg} kg` : "Sin datos"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-strong p-4">
            <p className="text-xs text-foreground/50">Última sesión</p>
            <p className="mt-1 text-sm font-semibold">{sessionLogs[0]?.sessionName ?? "Sin sesiones"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-strong p-4">
            <p className="text-xs text-foreground/50">Plan nutricional</p>
            {nutritionPlan ? (
              <p className="mt-1 text-sm font-semibold text-foreground">{nutritionPlan.title}</p>
            ) : (
              <p className="mt-1 text-sm text-foreground/40">Sin plan asignado</p>
            )}
          </div>
        </div>
      </SurfaceCard>
      </>
      )}

      {profileTab === "progreso" && (dailyWeight.length >= 2 || checkIns.length >= 2 || sessionLogs.length >= 2 || dailySleep.length >= 2) && (
        <SurfaceCard>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { key: "peso", label: "Peso", enabled: tabAvailability.peso },
              { key: "adherencia", label: "Adherencia", enabled: tabAvailability.adherencia },
              { key: "sueno", label: "Sueño", enabled: tabAvailability.sueno },
              { key: "volumen", label: "Volumen", enabled: tabAvailability.volumen },
            ].map((tab) => (
              <button
                key={tab.key}
                disabled={!tab.enabled}
                onClick={() => setMetricTab(tab.key as "peso" | "adherencia" | "sueno" | "volumen")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  metricTab === tab.key
                    ? "bg-accent text-white"
                    : "border border-line bg-surface-strong text-foreground/60"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {metricTab === "peso" && dailyWeight.length >= 2 && (() => {
            const weights = dailyWeight.map((c) => c.weightKg ?? 0);
            const first = weights[0];
            const last = weights[weights.length - 1];
            const diff = +(last - first).toFixed(1);
            const diffColor = diff < 0 ? "text-success" : diff > 0 ? "text-warning" : "text-foreground/40";
            return (
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                <div>
                  <p className="text-xs text-foreground/50">Peso corporal</p>
                  <p className="mt-1 text-3xl font-bold">{last} kg</p>
                  <p className={`mt-0.5 text-xs font-semibold ${diffColor}`}>{diff > 0 ? "+" : ""}{diff} kg vs inicio</p>
                  <p className="mt-2 text-xs text-foreground/40">Min {Math.min(...weights)} · Max {Math.max(...weights)} · {dailyWeight.length} registros</p>
                </div>
                <div className="rounded-3xl border border-line bg-surface-strong p-4"><Sparkline data={weights} width={220} height={72} /></div>
              </div>
            );
          })()}

          {metricTab === "adherencia" && checkIns.length >= 2 && (() => {
            const sorted = [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const adhs = sorted.map((c) => c.adherencePct);
            const avg = Math.round(adhs.reduce((a, b) => a + b, 0) / adhs.length);
            const avgColor = avg >= 80 ? "text-success" : avg >= 60 ? "text-warning" : "text-danger";
            return (
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                <div>
                  <p className="text-xs text-foreground/50">Adherencia media</p>
                  <p className={`mt-1 text-3xl font-bold ${avgColor}`}>{avg}%</p>
                  <p className="mt-0.5 text-xs text-foreground/40">últimos {checkIns.length} check-ins</p>
                  <p className="mt-2 text-xs text-foreground/40">Min {Math.min(...adhs)}% · Max {Math.max(...adhs)}%</p>
                </div>
                <div className="rounded-3xl border border-line bg-surface-strong p-4"><Sparkline data={adhs} width={220} height={72} color="#f59e0b" fill="rgba(245,158,11,0.12)" /></div>
              </div>
            );
          })()}

          {metricTab === "sueno" && dailySleep.length >= 2 && (() => {
            const sleeps = dailySleep.map((c) => c.sleepHours ?? 0);
            const avg = +(sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1);
            const avgColor = avg >= 7 ? "text-success" : avg >= 6 ? "text-warning" : "text-danger";
            return (
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                <div>
                  <p className="text-xs text-foreground/50">Sueño medio</p>
                  <p className={`mt-1 text-3xl font-bold ${avgColor}`}>{avg} h</p>
                  <p className="mt-0.5 text-xs text-foreground/40">últimos {dailySleep.length} registros diarios</p>
                  <p className="mt-2 text-xs text-foreground/40">Min {Math.min(...sleeps)} h · Max {Math.max(...sleeps)} h</p>
                </div>
                <div className="rounded-3xl border border-line bg-surface-strong p-4"><Sparkline data={sleeps} width={220} height={72} color="#818cf8" fill="rgba(129,140,248,0.12)" /></div>
              </div>
            );
          })()}

          {metricTab === "volumen" && sessionLogs.length >= 2 && (() => {
            const sorted = [...sessionLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const volumes = sorted.map((l) => Math.round(l.sets.reduce((acc, s) => acc + s.loadKg * s.reps, 0)));
            const lastVol = volumes[volumes.length - 1];
            const prevVol = volumes[volumes.length - 2];
            const volDiff = lastVol - prevVol;
            const volColor = volDiff > 0 ? "text-success" : volDiff < 0 ? "text-danger" : "text-foreground/40";
            return (
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                <div>
                  <p className="text-xs text-foreground/50">Volumen total</p>
                  <p className="mt-1 text-3xl font-bold">{lastVol.toLocaleString("es-ES")} kg</p>
                  <p className={`mt-0.5 text-xs font-semibold ${volColor}`}>{volDiff > 0 ? "+" : ""}{volDiff.toLocaleString("es-ES")} vs anterior</p>
                  <p className="mt-2 text-xs text-foreground/40">Máx {Math.max(...volumes).toLocaleString("es-ES")} kg · {sessionLogs.length} sesiones</p>
                </div>
                <div className="rounded-3xl border border-line bg-surface-strong p-4"><Sparkline data={volumes} width={220} height={72} color="#22c55e" fill="rgba(34,197,94,0.12)" /></div>
              </div>
            );
          })()}
        </SurfaceCard>
      )}

      {profileTab === "progreso" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <SurfaceCard>
            <p className="text-xs text-foreground/50">Perímetro cintura</p>
            {dailyWaist.length >= 2 ? (
              <>
                <p className="mt-1 text-2xl font-bold">{dailyWaist.at(-1)?.waistCm} cm</p>
                <Sparkline data={dailyWaist.map((d) => d.waistCm ?? 0)} width={180} height={56} color="#06b6d4" fill="rgba(6,182,212,0.12)" />
              </>
            ) : <p className="mt-2 text-sm text-foreground/40">Necesita al menos 2 registros diarios.</p>}
          </SurfaceCard>
          <SurfaceCard>
            <p className="text-xs text-foreground/50">Grasa corporal</p>
            {dailyFat.length >= 2 ? (
              <>
                <p className="mt-1 text-2xl font-bold">{dailyFat.at(-1)?.bodyFatPct}%</p>
                <Sparkline data={dailyFat.map((d) => d.bodyFatPct ?? 0)} width={180} height={56} color="#a855f7" fill="rgba(168,85,247,0.12)" />
              </>
            ) : <p className="mt-2 text-sm text-foreground/40">Necesita al menos 2 registros diarios.</p>}
          </SurfaceCard>
        </section>
      )}

      {profileTab === "musculos" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-4xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold">Volumen por grupo muscular</h2>
            {muscleVolumes.length === 0 ? (
              <p className="mt-4 text-sm text-foreground/50">Sin sesiones registradas todavía.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {muscleVolumes.map((m) => {
                  const max = muscleVolumes[0]?.volume || 1;
                  const pct = Math.max(8, Math.round((m.volume / max) * 100));
                  return (
                    <div key={m.group}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold">{m.group}</span>
                        <span className="text-foreground/50">{m.volume.toLocaleString("es-ES")} kg</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-strong">
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
          <article className="rounded-4xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold">Ejercicios más trabajados</h2>
            {topExercises.length === 0 ? (
              <p className="mt-4 text-sm text-foreground/50">Sin datos aún.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {topExercises.map((ex) => (
                  <li key={ex.exercise} className="flex items-center justify-between rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm">
                    <span>{ex.exercise}</span>
                    <span className="text-xs text-foreground/50">{ex.sets} series</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      {profileTab === "musculos" && topExercises.length >= 1 && (
        <section className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Progresión de fuerza</h2>
          <ExerciseProgressChart
            logs={sessionLogs}
            exercises={topExercises.map((e) => e.exercise)}
          />
        </section>
      )}

      {profileTab === "historial" && (
      <>
      <section>
        {/* Check-in history */}
        <article className="rounded-4xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Historial de check-ins</h2>
            <Link
              href={`/athlete/check-in?athleteId=${id}`}
              className="rounded-full border border-line bg-surface-strong px-4 py-1.5 text-xs font-medium transition hover:border-accent/40"
            >
              + Nuevo
            </Link>
          </div>

          {checkIns.length === 0 ? (
            <p className="mt-6 text-sm text-foreground/50">Sin check-ins registrados todavia.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {checkIns.slice().reverse().map((ci) => {
                const adh = ci.adherencePct;
                const adhClass = adh >= 80 ? "text-success" : adh >= 60 ? "text-warning" : "text-danger";
                return (
                  <li key={ci.id} className="rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{ci.weekLabel}</span>
                      <span className="text-xs text-foreground/40">
                        {new Date(ci.date).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/60">
                      <span>📅 {ci.weekLabel}</span>
                      <span>📝 Revisión periódica</span>
                      <span className={`font-semibold ${adhClass}`}>✓ {ci.adherencePct}% adherencia</span>
                    </div>
                    {ci.sensations && (
                      <p className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs italic text-foreground/50">
                        &ldquo;{ci.sensations}&rdquo;
                      </p>
                    )}
                    <CoachNoteInline checkInId={ci.id} initial={ci.coachNote} />
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>

      {/* Session history */}
      <section className="rounded-4xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Historial de entrenamientos</h2>
          <Link
            href={`/athlete/training-log?athleteId=${id}`}
            className="rounded-full border border-line bg-surface-strong px-4 py-1.5 text-xs font-medium transition hover:border-accent/40"
          >
            + Registrar sesión
          </Link>
        </div>

        {sessionLogs.length === 0 ? (
          <p className="mt-6 text-sm text-foreground/50">Sin sesiones registradas todavía.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {sessionLogs.slice(0, 8).map((log) => {
              const totalVol = log.sets.reduce((acc, s) => acc + s.loadKg * s.reps, 0);
              const uniqueEx = [...new Set(log.sets.map((s) => s.exercise))];
              return (
                <div key={log.id} className="rounded-2xl border border-line bg-surface-strong px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{log.sessionName}</p>
                      <p className="mt-0.5 text-xs text-foreground/40">
                        {new Date(log.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs text-foreground/50">
                      <span>{log.sets.length} series</span>
                      {totalVol > 0 && <span>{Math.round(totalVol).toLocaleString("es-ES")} kg vol.</span>}
                    </div>
                  </div>
                  {uniqueEx.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {uniqueEx.map((ex) => (
                        <span key={ex} className="rounded-lg border border-line bg-surface px-2 py-0.5 text-xs text-foreground/60">
                          {ex}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.notes && (
                    <p className="mt-2 text-xs italic text-foreground/40">&ldquo;{log.notes}&rdquo;</p>
                  )}
                </div>
              );
            })}
            {sessionLogs.length > 8 && (
              <p className="text-center text-xs text-foreground/40">
                +{sessionLogs.length - 8} sesiones más
              </p>
            )}
          </div>
        )}
      </section>

      {/* Health connections */}
      {athlete.healthConnections.length > 0 && (
        <section className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="font-semibold">Conexiones de salud</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {athlete.healthConnections.map((app) => (
              <span key={app} className="rounded-full border border-line bg-surface-strong px-4 py-1.5 text-sm">
                {app}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Documents */}
      <DocumentPanel athleteId={id} />
      </>
      )}
    </main>
  );
}
