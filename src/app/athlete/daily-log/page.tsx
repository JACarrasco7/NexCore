"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SectionIntro } from "@/components/section-intro";
import { useAthleteMe } from "@/lib/use-athlete-me";
import { useDailyLogs } from "@/lib/store";
import { Sparkline } from "@/components/sparkline";
import { AthleteAside } from "@/components/athlete-aside";
import type { DailyLogEntry } from "@/lib/domain";

type FormState = {
  athleteId: string;
  weightKg: string;
  steps: string;
  sleepHours: string;
  waistCm: string;
  bodyFatPct: string;
  notes: string;
};

const EMPTY: FormState = {
  athleteId: "",
  weightKg: "",
  steps: "",
  sleepHours: "",
  waistCm: "",
  bodyFatPct: "",
  notes: "",
};

function DailyLogContent() {
  const formId = useId();
  const searchParams = useSearchParams();
  const preselectedAthleteId = searchParams.get("athleteId") ?? "";
  const { athlete, loading: loadingMe, notFound } = useAthleteMe();
  const [form, setForm] = useState<FormState>(EMPTY);
  const athleteId = preselectedAthleteId || form.athleteId;
  const { dailyLogs, addDailyLog } = useDailyLogs(athleteId || undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (preselectedAthleteId) {
      setForm((prev) => ({ ...prev, athleteId: preselectedAthleteId }));
      return;
    }
    if (athlete?.id) {
      setForm((prev) => ({ ...prev, athleteId: athlete.id }));
    }
  }, [athlete?.id, preselectedAthleteId]);

  function update(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!form.athleteId) return;
    await addDailyLog({
      id: `dl-${Date.now()}`,
      athleteId: form.athleteId,
      date: new Date().toISOString(),
      weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
      steps: form.steps ? parseInt(form.steps, 10) : null,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : null,
      waistCm: form.waistCm ? parseFloat(form.waistCm) : null,
      bodyFatPct: form.bodyFatPct ? parseFloat(form.bodyFatPct) : null,
      notes: form.notes,
    });
    setSaved(true);
    setForm((prev) => ({ ...prev, notes: "" }));
  }

  if (loadingMe && !preselectedAthleteId) {
    return <main className="flex flex-1 items-center justify-center"><p className="text-sm text-foreground/50">Cargando perfil...</p></main>;
  }

  if (notFound && !preselectedAthleteId) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-foreground/60 text-sm">No tienes un perfil de atleta aun.</p>
          <p className="mt-2 text-xs text-foreground/40">Pide a tu coach que complete tu onboarding.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-6 py-8 md:px-10 lg:px-12">
      <main className="flex-1 min-w-0 flex flex-col gap-8">
      <SectionIntro
        eyebrow="Registro diario"
        title="Métricas rápidas del día"
        description="Peso, pasos, sueño y medidas para seguimiento de tendencia diaria."
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <article className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold">Nuevo registro</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={`${formId}-weight`} className="text-sm font-medium text-foreground/70">Peso (kg)</label>
              <input id={`${formId}-weight`} type="number" step="0.1" value={form.weightKg}
                onChange={(e) => update("weightKg", e.target.value)}
                placeholder="Ej: 82.4"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${formId}-steps`} className="text-sm font-medium text-foreground/70">Pasos</label>
              <input id={`${formId}-steps`} type="number" value={form.steps}
                onChange={(e) => update("steps", e.target.value)}
                placeholder="Ej: 9000"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${formId}-sleep`} className="text-sm font-medium text-foreground/70">Sueño (h)</label>
              <input id={`${formId}-sleep`} type="number" step="0.5" value={form.sleepHours}
                onChange={(e) => update("sleepHours", e.target.value)}
                placeholder="Ej: 7.5"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${formId}-waist`} className="text-sm font-medium text-foreground/70">Cintura (cm)</label>
              <input id={`${formId}-waist`} type="number" step="0.1" value={form.waistCm}
                onChange={(e) => update("waistCm", e.target.value)}
                placeholder="Ej: 84"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor={`${formId}-fat`} className="text-sm font-medium text-foreground/70">Grasa corporal (%)</label>
              <input id={`${formId}-fat`} type="number" step="0.1" value={form.bodyFatPct}
                onChange={(e) => update("bodyFatPct", e.target.value)}
                placeholder="Ej: 16.8"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor={`${formId}-notes`} className="text-sm font-medium text-foreground/70">Notas</label>
              <textarea id={`${formId}-notes`} rows={2} value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Observaciones breves del día..."
                className="w-full resize-none rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={handleSave}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
              Guardar registro
            </button>
            {saved && <span className="text-sm font-medium text-success">✓ Guardado</span>}
          </div>
        </article>

        <article className="rounded-4xl border border-line bg-surface-strong p-6">
          <h2 className="text-xl font-semibold">Resumen hoy</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricCard label="Peso" value={form.weightKg ? `${form.weightKg} kg` : "—"} />
            <MetricCard label="Pasos" value={form.steps ? Number(form.steps).toLocaleString("es-ES") : "—"} />
            <MetricCard label="Sueño" value={form.sleepHours ? `${form.sleepHours} h` : "—"} />
            <MetricCard label="Grasa" value={form.bodyFatPct ? `${form.bodyFatPct}%` : "—"} />
          </div>
        </article>
      </section>

      {dailyLogs.length > 0 && (
        <section className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="mb-1 text-xl font-semibold">Historial diario</h2>
          {/* Sparkline tendencia de peso */}
          {(() => {
            const sorted = dailyLogs
              .slice()
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const weightData = sorted
              .map((l) => l.weightKg)
              .filter((v): v is number => v !== null && v !== undefined);
            if (weightData.length < 2) return null;
            const first = weightData[0];
            const last = weightData[weightData.length - 1];
            const minW = Math.min(...weightData);
            const maxW = Math.max(...weightData);
            const diff = +(last - first).toFixed(1);
            const diffLabel = diff > 0 ? `+${diff}` : String(diff);
            const diffColor = diff < 0 ? "text-success" : diff > 0 ? "text-warning" : "text-foreground/50";
            const firstDate = sorted[0]?.date ? new Date(sorted[0].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
            const lastDate = sorted[sorted.length - 1]?.date ? new Date(sorted[sorted.length - 1].date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
            return (
              <div className="mb-5 mt-4 rounded-2xl border border-line bg-surface-strong p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-foreground/50 uppercase tracking-widest">Tendencia de peso</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">
                      {last} <span className="text-sm font-normal text-foreground/40">kg</span>
                    </p>
                    <p className={`text-xs font-semibold ${diffColor}`}>{diffLabel} kg vs inicio</p>
                  </div>
                  <div className="text-right text-xs text-foreground/40 space-y-1">
                    <p>Máx: <span className="font-semibold text-warning">{maxW} kg</span></p>
                    <p>Mín: <span className="font-semibold text-success">{minW} kg</span></p>
                    <p>{weightData.length} mediciones</p>
                  </div>
                </div>
                <Sparkline
                  data={weightData}
                  width={600}
                  height={60}
                  color="var(--accent)"
                  fill="var(--accent-soft)"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-foreground/35">
                  <span>{firstDate}</span>
                  <span>{lastDate}</span>
                </div>
              </div>
            );
          })()}
          <ul className="space-y-3">
            {dailyLogs.slice().reverse().map((log: DailyLogEntry) => (
              <li key={log.id} className="rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {new Date(log.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-xs text-foreground/40">Registro diario</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/60">
                  <span>⚖️ {log.weightKg ?? "—"} kg</span>
                  <span>👟 {log.steps?.toLocaleString("es-ES") ?? "—"} pasos</span>
                  <span>😴 {log.sleepHours ?? "—"} h sueño</span>
                  <span>📏 {log.waistCm ?? "—"} cm cintura</span>
                </div>
                {log.notes && (
                  <p className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-foreground/60">{log.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      </main>
      <AthleteAside />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-sm">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function DailyLogPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center"><p className="text-sm text-foreground/50">Cargando...</p></main>}>
      <DailyLogContent />
    </Suspense>
  );
}
