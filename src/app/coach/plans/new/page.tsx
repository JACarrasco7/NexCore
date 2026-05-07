"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionIntro } from "@/components/section-intro";
import { useToast } from "@/components/ui/toast";

// ─── tipos locales ────────────────────────────────────────────────────────────

type LocalExercise = {
  exercise: string;
  sets: number;
  reps: string;
  targetRir?: string;
  restSeconds?: number;
  notes?: string;
  loadKg?: number;
  loadNote?: string;
  coachCue?: string;
  progressionNote?: string;
};

type LocalSession = {
  name: string;
  block: string;
  exercises: LocalExercise[];
};

type PlanDraft = {
  title: string;
  weekLabel: string;
  athleteId: string;
  sessions: LocalSession[];
};

// ─── step components ──────────────────────────────────────────────────────────

function Step1({ draft, onChange }: { draft: PlanDraft; onChange: (d: Partial<PlanDraft>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/80">Nombre del plan</label>
        <input
          className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Ej. PPL Volumen - Semana 1"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/80">Etiqueta de semana</label>
        <input
          className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Ej. Semana 1"
          value={draft.weekLabel}
          onChange={(e) => onChange({ weekLabel: e.target.value })}
        />
      </div>
    </div>
  );
}

function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: LocalExercise;
  onChange: (patch: Partial<LocalExercise>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <input
          className="flex-1 rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Nombre del ejercicio"
          value={ex.exercise}
          onChange={(e) => onChange({ exercise: e.target.value })}
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger transition hover:bg-danger/10"
        >
          Quitar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Series</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={ex.sets}
            onChange={(e) => onChange({ sets: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Reps</label>
          <input
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="8-10"
            value={ex.reps}
            onChange={(e) => onChange({ reps: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">RIR objetivo</label>
          <input
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="2"
            value={ex.targetRir ?? ""}
            onChange={(e) => onChange({ targetRir: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Descanso (seg)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="90"
            value={ex.restSeconds ?? ""}
            onChange={(e) => onChange({ restSeconds: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Carga sugerida (kg)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="80"
            value={ex.loadKg ?? ""}
            onChange={(e) => onChange({ loadKg: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Nota de carga</label>
          <input
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="75% RM / RPE 8"
            value={ex.loadNote ?? ""}
            onChange={(e) => onChange({ loadNote: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Coach cue</label>
          <input
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Codos 45 grados"
            value={ex.coachCue ?? ""}
            onChange={(e) => onChange({ coachCue: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Criterio de progresion</label>
          <input
            className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Si >8 reps, +2.5 kg"
            value={ex.progressionNote ?? ""}
            onChange={(e) => onChange({ progressionNote: e.target.value || undefined })}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-foreground/50">Notas</label>
        <textarea
          rows={2}
          className="w-full rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Tecnica, variantes..."
          value={ex.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

function Step2({ draft, onChange }: { draft: PlanDraft; onChange: (d: Partial<PlanDraft>) => void }) {
  function addSession() {
    onChange({
      sessions: [
        ...draft.sessions,
        { name: `Sesion ${draft.sessions.length + 1}`, block: "Bloque A", exercises: [] },
      ],
    });
  }

  function removeSession(si: number) {
    onChange({ sessions: draft.sessions.filter((_, i) => i !== si) });
  }

  function updateSession(si: number, patch: Partial<LocalSession>) {
    onChange({ sessions: draft.sessions.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  }

  function addExercise(si: number) {
    const sessions = [...draft.sessions];
    sessions[si] = {
      ...sessions[si],
      exercises: [
        ...sessions[si].exercises,
        { exercise: "", sets: 3, reps: "8-10" },
      ],
    };
    onChange({ sessions });
  }

  function updateExercise(si: number, ei: number, patch: Partial<LocalExercise>) {
    const sessions = [...draft.sessions];
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)),
    };
    onChange({ sessions });
  }

  function removeExercise(si: number, ei: number) {
    const sessions = [...draft.sessions];
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.filter((_, i) => i !== ei),
    };
    onChange({ sessions });
  }

  return (
    <div className="space-y-6">
      {draft.sessions.length === 0 && (
        <p className="rounded-3xl border border-line bg-surface-strong px-5 py-6 text-sm text-foreground/50">
          Sin sesiones. Pulsa "Agregar sesion" para empezar.
        </p>
      )}
      {draft.sessions.map((s, si) => (
        <div key={si} className="rounded-3xl border border-line bg-surface-strong p-5">
          <div className="mb-4 flex items-center gap-3">
            <input
              className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
              value={s.name}
              onChange={(e) => updateSession(si, { name: e.target.value })}
              placeholder="Nombre de la sesion"
            />
            <input
              className="w-32 rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={s.block}
              onChange={(e) => updateSession(si, { block: e.target.value })}
              placeholder="Bloque"
            />
            <button
              type="button"
              onClick={() => removeSession(si)}
              className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger transition hover:bg-danger/10"
            >
              Borrar
            </button>
          </div>
          <div className="space-y-3">
            {s.exercises.map((ex, ei) => (
              <ExerciseRow
                key={ei}
                ex={ex}
                onChange={(patch) => updateExercise(si, ei, patch)}
                onRemove={() => removeExercise(si, ei)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => addExercise(si)}
            className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
          >
            + Ejercicio
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addSession}
        className="w-full rounded-3xl border border-dashed border-line py-4 text-sm text-foreground/60 transition hover:border-accent/40 hover:text-accent"
      >
        + Agregar sesion
      </button>
    </div>
  );
}

type Athlete = { id: string; fullName: string };

function Step3({
  draft,
  athletes,
  onChange,
}: {
  draft: PlanDraft;
  athletes: Athlete[];
  onChange: (d: Partial<PlanDraft>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground/80">Asignar a atleta</label>
        <select
          className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          value={draft.athleteId}
          onChange={(e) => onChange({ athleteId: e.target.value })}
        >
          <option value="">— Selecciona un atleta —</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>{a.fullName}</option>
          ))}
        </select>
      </div>
      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <p className="mb-1 text-xs text-foreground/45">Resumen del plan</p>
        <p className="font-semibold text-foreground">{draft.title || "(sin nombre)"}</p>
        <p className="mt-1 text-sm text-foreground/60">{draft.weekLabel}</p>
        <p className="mt-3 text-sm text-foreground/60">
          {draft.sessions.length} sesion{draft.sessions.length !== 1 ? "es" : ""} ·{" "}
          {draft.sessions.reduce((acc, s) => acc + s.exercises.length, 0)} ejercicios
        </p>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const STEPS = ["Datos del plan", "Sesiones y ejercicios", "Asignar atleta"];

const EMPTY_DRAFT: PlanDraft = {
  title: "",
  weekLabel: "Semana 1",
  athleteId: "",
  sessions: [],
};

export default function NewPlanPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [athletes, setAthletesCache] = useState<Athlete[]>([]);
  const [athletesLoaded, setAthletesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  function update(patch: Partial<PlanDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // Cargar atletas al llegar al paso 3
  async function goToStep3() {
    if (!athletesLoaded) {
      try {
        const res = await fetch("/api/athletes");
        if (res.ok) {
          const data = await res.json();
          setAthletesCache(
            (data as { id: string; fullName?: string; name?: string }[]).map((a) => ({
              id: a.id,
              fullName: a.fullName ?? a.name ?? a.id,
            }))
          );
        }
      } catch {
        // sin problema
      }
      setAthletesLoaded(true);
    }
    setStep(2);
  }

  function canAdvance() {
    if (step === 0) return draft.title.trim().length > 0 && draft.weekLabel.trim().length > 0;
    if (step === 1) return draft.sessions.length > 0 && draft.sessions.every((s) => s.exercises.length > 0 && s.exercises.every((e) => e.exercise.trim().length > 0));
    if (step === 2) return draft.athleteId.length > 0;
    return false;
  }

  async function handleSave() {
    if (!canAdvance()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: draft.athleteId,
          title: draft.title,
          weekLabel: draft.weekLabel,
          sessions: draft.sessions,
        }),
      });

      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}));
        pushToast({ title: err.error ?? "Error al crear el plan", variant: "error" });
        setSaving(false);
        return;
      }

      const plan: { id: string } = await res.json();

      if (saveAsTemplate && templateName.trim()) {
        await fetch("/api/plans/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            payload: { sessions: draft.sessions },
          }),
        });
      }

      pushToast({ title: "Plan creado correctamente", variant: "success" });
      router.push(`/coach/athletes/${draft.athleteId}`);
      void plan;
    } catch {
      pushToast({ title: "Error inesperado", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <SectionIntro
        eyebrow="Planes de entrenamiento"
        title="Nuevo plan"
        description="Crea un plan manualmente paso a paso y asignalo a un atleta."
      />

      {/* Steps bar */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { if (i < step) setStep(i); }}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              i === step
                ? "bg-accent text-white"
                : i < step
                ? "bg-accent/20 text-accent"
                : "bg-surface-strong text-foreground/40"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-4xl border border-line bg-surface p-6 sm:p-8">
        {step === 0 && <Step1 draft={draft} onChange={update} />}
        {step === 1 && <Step2 draft={draft} onChange={update} />}
        {step === 2 && <Step3 draft={draft} athletes={athletes} onChange={update} />}

        {/* Guardar como template (solo en paso 2 y 3) */}
        {step >= 1 && (
          <div className="mt-6 rounded-3xl border border-line bg-surface-strong p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-accent"
              />
              <span className="text-sm font-medium text-foreground/75">Guardar tambien como plantilla</span>
            </label>
            {saveAsTemplate && (
              <input
                className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Nombre de la plantilla (ej. PPL Volumen)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between gap-4">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="rounded-2xl border border-line bg-surface-strong px-6 py-3 text-sm font-medium transition hover:border-accent/30 disabled:opacity-40"
        >
          Atras
        </button>
        {step < 2 ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => (step === 1 ? goToStep3() : setStep(step + 1))}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            disabled={!canAdvance() || saving}
            onClick={handleSave}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Crear plan"}
          </button>
        )}
      </div>
    </main>
  );
}
