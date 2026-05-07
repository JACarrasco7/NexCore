"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SectionIntro } from "@/components/section-intro";
import { useAthletes, useTrainingPlans, useSessionLogs } from "@/lib/store";
import { useAthleteMe } from "@/lib/use-athlete-me";
import { TECHNIQUE_LABELS } from "@/lib/domain";
import type { SetLog, SessionLog, ExercisePrescription, HighIntensityTechnique } from "@/lib/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { AthleteAside } from "@/components/athlete-aside";

// ─── Types ──────────────────────────────────────────────────────────────────

type SetEntry = { loadKg: string; reps: string; rir: string; done: boolean };
type SetEntryField = "loadKg" | "reps" | "rir";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildEmptySets(ex: ExercisePrescription): SetEntry[] {
  return Array.from({ length: ex.sets }, () => ({
    loadKg: ex.loadKg ? String(ex.loadKg) : "",
    reps: "",
    rir: ex.targetRir ?? "",
    done: false,
  }));
}

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

// ─── Rest Timer ──────────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    ref.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current!);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [seconds, onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-4 py-3">
      <div className="relative h-10 w-10 shrink-0">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke="#f59e0b" strokeWidth="3" strokeDasharray="100"
            strokeDashoffset={100 - pct} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-300">
          {remaining}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-amber-300">Descansando...</p>
        <p className="text-xs text-amber-300/60">{seconds}s de recuperación</p>
      </div>
      <button
        onClick={onDone}
        className="ml-auto rounded-full border border-amber-700/40 px-3 py-1 text-xs text-amber-300 transition hover:bg-amber-700/20"
      >
        Saltar
      </button>
    </div>
  );
}

// ─── Exercise Card ───────────────────────────────────────────────────────────

function ExerciseCard({
  ex,
  exIdx,
  entries,
  prevSets,
  onUpdate,
  onSetDone,
}: {
  ex: ExercisePrescription;
  exIdx: number;
  entries: SetEntry[];
  prevSets: SetLog[];
  onUpdate: (setIdx: number, field: SetEntryField, value: string) => void;
  onSetDone: (setIdx: number, rest: number) => void;
}) {
  const [showCues, setShowCues] = useState(false);
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const techKey = ex.technique as HighIntensityTechnique;
  const techColor = TECH_COLORS[techKey] ?? "bg-slate-700/30 text-slate-300 border-slate-600/40";
  const hasTempoFull = ex.tempoEcc && ex.tempoConc;
  const tempoStr = hasTempoFull ? `${ex.tempoEcc}-${ex.tempoPause ?? 0}-${ex.tempoConc}` : null;
  const hasCues = ex.coachCue || ex.progressionNote || ex.techniqueDetail;

  function handleMarkDone(setIdx: number) {
    onSetDone(setIdx, ex.restSeconds ?? 90);
    setActiveTimer(ex.restSeconds ?? 90);
  }

  return (
    <div className="overflow-hidden rounded-4xl border border-line bg-surface">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{ex.exercise}</h3>
            {ex.technique && (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${techColor}`}>
                {TECHNIQUE_LABELS[techKey] ?? ex.technique}
              </span>
            )}
            {ex.videoUrl && (
              <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                className="rounded-full border border-line px-2 py-0.5 text-xs text-accent transition hover:bg-surface-strong">
                Demo
              </a>
            )}
            <Link
              href={`/athlete/exercise/${encodeURIComponent(ex.exercise)}`}
              className="rounded-full border border-line px-2 py-0.5 text-xs text-foreground/50 transition hover:text-foreground"
            >
              Ver detalle
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-foreground/55">
            <span className="font-mono font-semibold text-foreground/80">{ex.sets} × {ex.reps}</span>
            {ex.targetRir !== undefined && <span>RIR {ex.targetRir}</span>}
            {tempoStr && <span className="font-mono">Tempo {tempoStr}</span>}
            {ex.loadKg && <span>{ex.loadKg} kg{ex.loadNote ? ` · ${ex.loadNote}` : ""}</span>}
            {ex.restSeconds && <span>{ex.restSeconds}s descanso</span>}
          </div>
        </div>
        {hasCues && (
          <button
            onClick={() => setShowCues((v) => !v)}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-foreground/50 transition hover:text-foreground"
          >
            {showCues ? "Ocultar" : "Cues"}
          </button>
        )}
      </div>

      {/* Coach cues panel */}
      {showCues && hasCues && (
        <div className="space-y-2 border-b border-line bg-surface-strong px-5 py-4 text-xs">
          {ex.techniqueDetail && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-danger">
              ⚡ {ex.techniqueDetail}
            </div>
          )}
          {ex.coachCue && (
            <div className="rounded-xl border border-line bg-surface px-3 py-2 italic text-foreground/70">
              &ldquo;{ex.coachCue}&rdquo;
            </div>
          )}
          {ex.progressionNote && (
            <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-success">
              📈 {ex.progressionNote}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="px-5 py-4">
        {/* Previous session reference */}
        {prevSets.length > 0 && (
          <div className="mb-3 rounded-xl border border-line bg-surface-strong px-3 py-2">
            <p className="mb-1.5 text-xs font-medium text-foreground/40">Última sesión registrada</p>
            <div className="grid grid-cols-4 gap-2 text-xs text-foreground/50">
              <span></span>
              <span>kg</span><span>reps</span><span>RIR</span>
            </div>
            {prevSets.map((s, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 text-xs text-foreground/60 mt-1">
                <span className="text-foreground/30">S{s.setNumber}</span>
                <span>{s.loadKg}</span>
                <span>{s.reps}</span>
                <span>{s.rir}</span>
              </div>
            ))}
          </div>
        )}

        {/* Column headers */}
        <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 px-1 text-xs font-medium text-foreground/40">
          <span>#</span><span>Carga (kg)</span><span>Reps</span><span>RIR</span><span></span>
        </div>

        {/* Set rows */}
        <div className="space-y-2">
          {entries.map((entry, setIdx) => (
            <div key={setIdx} className={`grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 transition-opacity ${entry.done ? "opacity-40" : ""}`}>
              <span className={`flex items-center justify-center rounded-xl border py-2 text-center text-sm font-bold ${
                entry.done
                  ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400"
                  : "border-line bg-surface-strong text-foreground/50"
              }`}>
                {entry.done ? "✓" : setIdx + 1}
              </span>
              <input
                type="number" step="0.5" value={entry.loadKg}
                onChange={(e) => onUpdate(setIdx, "loadKg", e.target.value)}
                placeholder={prevSets[setIdx]?.loadKg ? String(prevSets[setIdx].loadKg) : "0"}
                disabled={entry.done}
                className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none transition focus:border-accent disabled:opacity-60"
              />
              <input
                type="number" value={entry.reps}
                onChange={(e) => onUpdate(setIdx, "reps", e.target.value)}
                placeholder={prevSets[setIdx]?.reps ? String(prevSets[setIdx].reps) : "0"}
                disabled={entry.done}
                className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none transition focus:border-accent disabled:opacity-60"
              />
              <input
                type="number" min="0" max="5" value={entry.rir}
                onChange={(e) => onUpdate(setIdx, "rir", e.target.value)}
                placeholder="—"
                disabled={entry.done}
                className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none transition focus:border-accent disabled:opacity-60"
              />
              <button
                onClick={() => !entry.done && handleMarkDone(setIdx)}
                disabled={entry.done || !entry.loadKg || !entry.reps}
                className="flex items-center justify-center rounded-xl border border-line bg-surface-strong text-lg transition hover:border-emerald-700/60 hover:bg-emerald-900/20 hover:text-emerald-400 disabled:opacity-30"
                title="Marcar serie completada"
              >
                ✓
              </button>
            </div>
          ))}
        </div>

        {/* Rest timer */}
        {activeTimer !== null && (
          <div className="mt-3">
            <RestTimer seconds={activeTimer} onDone={() => setActiveTimer(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function TrainingLogContent() {
  const searchParams = useSearchParams();
  const preselectedAthleteId = searchParams.get("athleteId") ?? "";

  const { athlete: athleteMe, loading: loadingMe } = useAthleteMe();
  const { athletes, loading: loadingAthletes } = useAthletes();
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId);

  useEffect(() => {
    if (preselectedAthleteId) {
      setSelectedAthleteId(preselectedAthleteId);
    } else if (athleteMe && !selectedAthleteId) {
      setSelectedAthleteId(athleteMe.id);
    }
  }, [athleteMe, preselectedAthleteId, selectedAthleteId]);

  const { plans, loading: loadingPlans } = useTrainingPlans(selectedAthleteId || undefined);
  const { logs, addSessionLog } = useSessionLogs(selectedAthleteId || undefined);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [setEntries, setSetEntries] = useState<Record<number, SetEntry[]>>({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLog, setSavedLog] = useState<SessionLog | null>(null);

  // ── Cronómetro de sesión ──────────────────────────────────────────────────
  const sessionStartRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0); // segundos
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arrancar cronómetro al seleccionar sesión
  useEffect(() => {
    if (selectedSessionId && !sessionStartRef.current) {
      sessionStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - sessionStartRef.current!) / 1000));
      }, 1000);
    }
    if (!selectedSessionId) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      sessionStartRef.current = null;
      setElapsed(0);
    }
    return () => { /* no limpiar aquí para que siga entre re-renders */ };
  }, [selectedSessionId]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const fmtElapsed = `${String(elapsedMin).padStart(2, "0")}:${String(elapsedSec).padStart(2, "0")}`;

  // Estimación kcal: MET entrenamiento resistencia (~5.5) × peso(kg) × horas
  // Solo cae a 75 kg cuando todavía no existe ninguna medición real.
  const athleteWeightKg = athleteMe?.latestWeightKg ?? 75;
  const kcalEst = elapsed > 0
    ? Math.round(5.5 * athleteWeightKg * (elapsed / 3600))
    : 0;

  // ── Datos manuales del reloj ──────────────────────────────────────────────
  const [wearable, setWearable] = useState({ kcal: "", hr: "", source: "manual" as string });
  const [showWearable, setShowWearable] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedSession = selectedPlan?.sessions.find((s) => s.id === selectedSessionId);

  // Previous session for each exercise (last log for same sessionId)
  const prevSessionLog = logs
    .filter((l) => l.sessionId === selectedSessionId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;

  function getPrevSets(exIdx: number): SetLog[] {
    if (!prevSessionLog) return [];
    return prevSessionLog.sets
      .filter((s) => s.exerciseIndex === exIdx)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  function handleAthleteChange(id: string) {
    setSelectedAthleteId(id);
    setSelectedPlanId(""); setSelectedSessionId(""); setSetEntries({}); setSaved(false);
  }

  function handlePlanChange(planId: string) {
    setSelectedPlanId(planId); setSelectedSessionId(""); setSetEntries({}); setSaved(false);
  }

  function handleSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId); setSaved(false);
    const session = selectedPlan?.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const entries: Record<number, SetEntry[]> = {};
    session.exercises.forEach((ex, i) => { entries[i] = buildEmptySets(ex); });
    setSetEntries(entries);
  }

  const updateSet = useCallback((exIdx: number, setIdx: number, field: SetEntryField, value: string) => {
    setSetEntries((prev) => {
      const copy = { ...prev };
      copy[exIdx] = (copy[exIdx] ?? []).map((s, i) =>
        i === setIdx ? { ...s, [field]: value } : s
      );
      return copy;
    });
  }, []);

  const markSetDone = useCallback((exIdx: number, setIdx: number) => {
    setSetEntries((prev) => {
      const copy = { ...prev };
      copy[exIdx] = (copy[exIdx] ?? []).map((s, i) =>
        i === setIdx ? { ...s, done: true } : s
      );
      return copy;
    });
  }, []);

  async function handleSave() {
    if (!selectedSession || !selectedAthleteId) return;
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const durationMin = Math.round(elapsed / 60) || null;
    const kcalFinal = wearable.kcal ? parseInt(wearable.kcal) : (kcalEst > 0 ? kcalEst : null);
    const hrFinal = wearable.hr ? parseInt(wearable.hr) : null;
    const sourceFinal = wearable.kcal ? wearable.source : "manual";
    const sets: SetLog[] = [];
    selectedSession.exercises.forEach((ex, exIdx) => {
      (setEntries[exIdx] ?? []).forEach((entry, setIdx) => {
        if (entry.loadKg || entry.reps) {
          sets.push({
            exerciseIndex: exIdx,
            exercise: ex.exercise,
            setNumber: setIdx + 1,
            loadKg: parseFloat(entry.loadKg) || 0,
            reps: parseInt(entry.reps) || 0,
            rir: parseInt(entry.rir) || 0,
          });
        }
      });
    });
    const log = await addSessionLog({
      id: `log-${Date.now()}`,
      athleteId: selectedAthleteId,
      planId: selectedPlanId,
      sessionId: selectedSession.id,
      sessionName: selectedSession.name,
      date: new Date().toISOString(),
      notes,
      durationMin,
      kcalBurned: kcalFinal,
      heartRateAvg: hrFinal,
      source: sourceFinal,
      sets,
    });
    setSaving(false);
    setSaved(true);
    setSavedLog(log ?? null);
  }

  const completedSets = Object.values(setEntries).flat().filter((s) => s.done).length;
  const totalSets = Object.values(setEntries).flat().length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  if (loadingAthletes || loadingMe) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-6 py-8 md:px-10 lg:px-12">
      <main className="flex-1 min-w-0 flex flex-col gap-8">
      <SectionIntro
        eyebrow="Rutina viva"
        title="Registro de sesión"
        description="Registra series reales, marca cada una completada y el temporizador de descanso se activa automáticamente."
        aside={selectedSession ? `${completedSets}/${totalSets} series` : undefined}
      />

      {/* Selectors */}
      <section className={`grid gap-4 ${athleteMe ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {!athleteMe && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/60">Atleta</label>
            <select value={selectedAthleteId} onChange={(e) => handleAthleteChange(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent">
              <option value="">Seleccionar atleta</option>
              {athletes.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/60">Plan</label>
          <select value={selectedPlanId} onChange={(e) => handlePlanChange(e.target.value)}
            disabled={!selectedAthleteId || loadingPlans}
            className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent disabled:opacity-50">
            <option value="">Seleccionar plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/60">Sesión</label>
          <select value={selectedSessionId} onChange={(e) => handleSessionChange(e.target.value)}
            disabled={!selectedPlanId}
            className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent disabled:opacity-50">
            <option value="">Seleccionar sesión</option>
            {selectedPlan?.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </section>

      {/* No plan assigned */}
      {selectedAthleteId && !loadingPlans && plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-4xl border border-line bg-surface py-16 text-center">
          <p className="text-xl font-semibold">Sin rutina asignada</p>
          <p className="text-sm text-foreground/60">Importa una rutina CSV para este atleta primero.</p>
          <Link href="/coach/import-lab"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
            Ir a Import CSV
          </Link>
        </div>
      )}

      {/* Cronómetro de sesión + kcal estimado */}
      {selectedSession && !saved && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-xl font-bold tabular-nums">{fmtElapsed}</span>
            <span className="text-xs text-foreground/40">en sesión</span>
          </div>
          <div className="h-4 w-px bg-line hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-foreground/50">
            <span>~{kcalEst}</span>
            <span className="text-foreground/30">kcal estimadas</span>
            <span className="text-[10px] text-foreground/25">(MET×peso)</span>
          </div>
          <button
            onClick={() => setShowWearable((v) => !v)}
            className="ml-auto text-xs text-accent/70 hover:text-accent transition"
          >
            {showWearable ? "Ocultar reloj" : "⌚ Datos del reloj"}
          </button>
        </div>
      )}

      {/* Panel importación manual del reloj */}
      {selectedSession && !saved && showWearable && (
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⌚</span>
            <p className="text-sm font-semibold">Datos del reloj / wearable</p>
            <span className="ml-auto text-[10px] text-foreground/35 uppercase tracking-widest">Sobrescriben la estimación</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/55">kcal quemadas</label>
              <input
                type="number"
                min="0"
                value={wearable.kcal}
                onChange={(e) => setWearable((w) => ({ ...w, kcal: e.target.value }))}
                placeholder={`~${kcalEst} (estimado)`}
                className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/55">FC media (bpm)</label>
              <input
                type="number"
                min="0"
                max="250"
                value={wearable.hr}
                onChange={(e) => setWearable((w) => ({ ...w, hr: e.target.value }))}
                placeholder="p.ej. 142"
                className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/55">Fuente</label>
              <select
                value={wearable.source}
                onChange={(e) => setWearable((w) => ({ ...w, source: e.target.value }))}
                className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="manual">Manual</option>
                <option value="apple_health">Apple Watch / Health</option>
                <option value="samsung_health">Samsung Health</option>
                <option value="garmin">Garmin</option>
                <option value="polar">Polar</option>
                <option value="fitbit">Fitbit</option>
                <option value="google_fit">Google Fit / Wear OS</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-foreground/35">
            Consulta el resumen de actividad en tu app del reloj y copia los valores aquí. Se guardan junto al registro del entrenamiento.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {selectedSession && totalSets > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-foreground/50">
            <span>Progreso de la sesión</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Session complete banner */}
      {saved && savedLog && (
        <div className="rounded-4xl border border-emerald-700/40 bg-emerald-900/20 p-6 text-center">
          <p className="text-2xl font-bold text-emerald-300">Sesión completada 🎉</p>
          <p className="mt-1 text-sm text-emerald-300/70">
            {savedLog.sessionName} · {savedLog.sets.length} series registradas
          </p>
          {/* Stats resumen */}
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            {savedLog.durationMin != null && (
              <div className="rounded-xl bg-emerald-900/30 px-4 py-2 text-center">
                <p className="text-lg font-bold text-emerald-200">{savedLog.durationMin} min</p>
                <p className="text-[11px] text-emerald-300/50">Duración</p>
              </div>
            )}
            {savedLog.kcalBurned != null && (
              <div className="rounded-xl bg-emerald-900/30 px-4 py-2 text-center">
                <p className="text-lg font-bold text-emerald-200">{savedLog.kcalBurned} kcal</p>
                <p className="text-[11px] text-emerald-300/50">
                  {savedLog.source && savedLog.source !== "manual" ? savedLog.source : "Estimadas"}
                </p>
              </div>
            )}
            {savedLog.heartRateAvg != null && (
              <div className="rounded-xl bg-emerald-900/30 px-4 py-2 text-center">
                <p className="text-lg font-bold text-emerald-200">{savedLog.heartRateAvg} bpm</p>
                <p className="text-[11px] text-emerald-300/50">FC media</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setSaved(false); setSavedLog(null); setSelectedSessionId(""); setSetEntries({});
                setNotes(""); setWearable({ kcal: "", hr: "", source: "manual" }); setShowWearable(false);
              }}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Nueva sesión
            </button>
            <Link href={athleteMe ? `/athlete/${athleteMe.id}` : "/coach"}
              className="rounded-full border border-emerald-700/40 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-900/30">
              Ver perfil
            </Link>
          </div>
        </div>
      )}

      {/* Exercise cards */}
      {selectedSession && !saved && (
        <section className="space-y-4">
          {prevSessionLog && (
            <div className="flex items-center gap-2 text-xs text-foreground/40">
              <span className="h-px flex-1 bg-line" />
              <span>Referencia: {new Date(prevSessionLog.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}

          {selectedSession.exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={`${selectedSession.id}-${exIdx}`}
              ex={ex}
              exIdx={exIdx}
              entries={setEntries[exIdx] ?? buildEmptySets(ex)}
              prevSets={getPrevSets(exIdx)}
              onUpdate={(setIdx, field, value) => updateSet(exIdx, setIdx, field, value)}
              onSetDone={(setIdx, _rest) => markSetDone(exIdx, setIdx)}
            />
          ))}

          {/* Notes + save */}
          <div className="space-y-3 rounded-4xl border border-line bg-surface p-5">
            <label className="text-sm font-medium text-foreground/70">Notas de la sesión</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Sensaciones, incidencias, ajustes..."
              className="w-full resize-none rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
            />
            <div className="flex items-center gap-4">
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar sesión"}
              </button>
              <span className="text-xs text-foreground/40">
                {completedSets}/{totalSets} series completadas
              </span>
            </div>
          </div>
        </section>
      )}
      </main>
      <AthleteAside />
    </div>
  );
}

export default function TrainingLogPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </main>
    }>
      <TrainingLogContent />
    </Suspense>
  );
}
