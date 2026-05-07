"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ATHLETE_CONTEXT,
  type AthleteContextProfileData,
  type GymMachineItem,
  type MobilityTestItem,
  type ObjectiveMuscleItem,
  type RestrictionItem,
} from "@/lib/athlete-context";

const HI_TECHNIQUES = [
  { key: "drop_set", name: "Drop set", use: "Última serie", rir: "0-1", notes: "Quitar 15-25% de carga y continuar sin descanso largo." },
  { key: "rest_pause", name: "Rest pause", use: "Serie principal", rir: "0-1", notes: "Mini pausas de 10-20s para acumular reps de calidad." },
  { key: "myo_reps", name: "Myo reps", use: "Aislamiento", rir: "1", notes: "Activación + clusters cortos manteniendo técnica." },
  { key: "tempo", name: "Tempo", use: "Control técnico", rir: "1-3", notes: "Más TUT en puntos débiles; 3-1-1 o 4-1-1." },
  { key: "amrap", name: "AMRAP", use: "Top set", rir: "0", notes: "Solo cuando haya consistencia técnica y recuperación alta." },
];

const MACHINE_GROUP_OPTIONS = [
  "Pierna",
  "Glúteo",
  "Espalda",
  "Pecho",
  "Hombro",
  "Bíceps",
  "Tríceps",
  "Core",
  "Cardio",
  "Otro",
] as const;

type Props = {
  athleteId: string;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SeverityChip({ level }: { level: MobilityTestItem["severity"] }) {
  const cls =
    level === "ok"
      ? "border-success/30 bg-success/10 text-success"
      : level === "warning"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-danger/30 bg-danger/10 text-danger";

  const label = level === "ok" ? "OK" : level === "warning" ? "Precaución" : "Riesgo";

  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export function AthleteContextPanel({ athleteId }: Props) {
  const [data, setData] = useState<AthleteContextProfileData>(DEFAULT_ATHLETE_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [machineImageError, setMachineImageError] = useState<string>("");
  const machineReadOnly = true;

  // Calculator inputs
  const [amrapLoad, setAmrapLoad] = useState("100");
  const [amrapReps, setAmrapReps] = useState("5");
  const [machineQuery, setMachineQuery] = useState("");
  const [machineGroupFilter, setMachineGroupFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/athletes/${athleteId}/context`)
      .then((r) => (r.ok ? r.json() : DEFAULT_ATHLETE_CONTEXT))
      .then((payload) => {
        if (cancelled) return;
        setData({ ...DEFAULT_ATHLETE_CONTEXT, ...payload });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  async function saveContext() {
    setSaving(true);
    setMachineImageError("");
    const { gymMachines: _ignoredGymMachines, ...coachEditablePayload } = data;

    const res = await fetch(`/api/athletes/${athleteId}/context`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coachEditablePayload),
    });

    if (res.ok) {
      const payload = await res.json();
      setData(payload);
    }
    setSaving(false);
  }

  const e1rm = useMemo(() => {
    const load = Number(amrapLoad);
    const reps = Number(amrapReps);
    if (!load || !reps || reps < 1) return null;
    return +(load * (1 + reps / 30)).toFixed(1);
  }, [amrapLoad, amrapReps]);

  const percentRows = useMemo(() => {
    if (!e1rm) return [] as Array<{ pct: number; kg: number; rm: number }>;
    const pcts = [97.5, 95, 92.5, 90, 87.5, 85, 82.5, 80, 77.5, 75, 72.5, 70, 67.5];
    return pcts.map((pct, idx) => ({
      pct,
      kg: +((e1rm * pct) / 100).toFixed(2),
      rm: idx + 2,
    }));
  }, [e1rm]);

  function updateMobility(id: string, patch: Partial<MobilityTestItem>) {
    setData((prev) => ({
      ...prev,
      mobilityTests: prev.mobilityTests.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }

  function removeMobility(id: string) {
    setData((prev) => ({
      ...prev,
      mobilityTests: prev.mobilityTests.filter((t) => t.id !== id),
    }));
  }

  function addMobility() {
    setData((prev) => ({
      ...prev,
      mobilityTests: [
        ...prev.mobilityTests,
        { id: uid("mob"), test: "", finding: "", implication: "", severity: "warning" },
      ],
    }));
  }

  function updateRestriction(
    type: "restrictedFoods" | "restrictedExercises",
    id: string,
    patch: Partial<RestrictionItem>
  ) {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }

  function addRestriction(type: "restrictedFoods" | "restrictedExercises") {
    setData((prev) => ({
      ...prev,
      [type]: [...prev[type], { id: uid(type), name: "", reason: "" }],
    }));
  }

  function removeRestriction(type: "restrictedFoods" | "restrictedExercises", id: string) {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].filter((i) => i.id !== id),
    }));
  }

  function updateObjective(id: string, patch: Partial<ObjectiveMuscleItem>) {
    setData((prev) => ({
      ...prev,
      objectiveMuscles: prev.objectiveMuscles.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  function addObjective() {
    setData((prev) => ({
      ...prev,
      objectiveMuscles: [
        ...prev.objectiveMuscles,
        {
          id: uid("obj"),
          muscle: "",
          priority: "media",
          idealVolume: "",
          maxVolume: "",
        },
      ],
    }));
  }

  function removeObjective(id: string) {
    setData((prev) => ({
      ...prev,
      objectiveMuscles: prev.objectiveMuscles.filter((m) => m.id !== id),
    }));
  }

  function updateMachine(id: string, patch: Partial<GymMachineItem>) {
    setData((prev) => ({
      ...prev,
      gymMachines: prev.gymMachines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  function addMachine() {
    setData((prev) => ({
      ...prev,
      gymMachines: [...prev.gymMachines, { id: uid("machine"), name: "", brand: "", model: "", muscleGroup: "Pierna", note: "", imageUrl: "" }],
    }));
  }

  function removeMachine(id: string) {
    setData((prev) => ({
      ...prev,
      gymMachines: prev.gymMachines.filter((m) => m.id !== id),
    }));
  }

  function uploadMachineImage(id: string, file: File | null) {
    if (!file) return;
    setMachineImageError("");

    const maxBytes = 4 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      setMachineImageError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > maxBytes) {
      setMachineImageError("La imagen supera 4MB. Usa una más ligera.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      updateMachine(id, { imageUrl: result });
    };
    reader.readAsDataURL(file);
  }

  const visibleMachines = useMemo(() => {
    const q = machineQuery.trim().toLowerCase();
    return data.gymMachines
      .filter((m) => {
        const matchesGroup = machineGroupFilter === "all" || (m.muscleGroup ?? "") === machineGroupFilter;
        const haystack = `${m.name ?? ""} ${m.brand ?? ""} ${m.model ?? ""} ${m.note ?? ""} ${m.muscleGroup ?? ""}`.toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        return matchesGroup && matchesQuery;
      })
      .slice()
      .sort((a, b) => {
        const groupA = (a.muscleGroup ?? "Otro").localeCompare(b.muscleGroup ?? "Otro", "es", { sensitivity: "base" });
        if (groupA !== 0) return groupA;
        return (a.name ?? "").localeCompare(b.name ?? "", "es", { sensitivity: "base" });
      });
  }, [data.gymMachines, machineGroupFilter, machineQuery]);

  if (loading) {
    return <div className="rounded-4xl border border-line bg-surface p-6 text-sm text-foreground/45">Cargando contexto del atleta…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Tests movilidad y postura</h3>
            <p className="text-xs text-foreground/45">Plantilla editable tipo hoja coach: test, hallazgo e implicación práctica.</p>
          </div>
          <button
            type="button"
            onClick={addMobility}
            className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm transition hover:border-accent/35"
          >
            + Test
          </button>
        </div>

        <div className="space-y-3">
          {data.mobilityTests.map((t) => (
            <div key={t.id} className="rounded-3xl border border-line bg-surface-strong p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <SeverityChip level={t.severity} />
                <button
                  type="button"
                  onClick={() => removeMobility(t.id)}
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                >
                  Eliminar
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={t.test}
                  onChange={(e) => updateMobility(t.id, { test: e.target.value })}
                  placeholder="Test realizado"
                  className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-accent"
                />
                <select
                  value={t.severity}
                  onChange={(e) => updateMobility(t.id, { severity: e.target.value as MobilityTestItem["severity"] })}
                  className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-accent"
                >
                  <option value="ok">OK</option>
                  <option value="warning">Precaución</option>
                  <option value="risk">Riesgo</option>
                </select>
                <input
                  value={t.finding}
                  onChange={(e) => updateMobility(t.id, { finding: e.target.value })}
                  placeholder="Problema detectado"
                  className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-accent md:col-span-2"
                />
                <input
                  value={t.implication}
                  onChange={(e) => updateMobility(t.id, { implication: e.target.value })}
                  placeholder="Implicación en entrenamiento"
                  className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-accent md:col-span-2"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Alimentos no pautables</h3>
            <button
              type="button"
              onClick={() => addRestriction("restrictedFoods")}
              className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm transition hover:border-accent/35"
            >
              + Alimento
            </button>
          </div>
          <div className="space-y-2">
            {data.restrictedFoods.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl border border-line bg-surface-strong p-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={item.name}
                  onChange={(e) => updateRestriction("restrictedFoods", item.id, { name: e.target.value })}
                  placeholder="Nombre alimento"
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <input
                  value={item.reason}
                  onChange={(e) => updateRestriction("restrictedFoods", item.id, { reason: e.target.value })}
                  placeholder="Motivo"
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => removeRestriction("restrictedFoods", item.id)}
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                >
                  Quitar
                </button>
              </div>
            ))}
            {data.restrictedFoods.length === 0 && <p className="text-xs text-foreground/40">Sin restricciones cargadas.</p>}
          </div>
        </div>

        <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Ejercicios no pautables</h3>
            <button
              type="button"
              onClick={() => addRestriction("restrictedExercises")}
              className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm transition hover:border-accent/35"
            >
              + Ejercicio
            </button>
          </div>
          <div className="space-y-2">
            {data.restrictedExercises.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl border border-line bg-surface-strong p-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={item.name}
                  onChange={(e) => updateRestriction("restrictedExercises", item.id, { name: e.target.value })}
                  placeholder="Nombre ejercicio"
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <input
                  value={item.reason}
                  onChange={(e) => updateRestriction("restrictedExercises", item.id, { reason: e.target.value })}
                  placeholder="Motivo"
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => removeRestriction("restrictedExercises", item.id)}
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                >
                  Quitar
                </button>
              </div>
            ))}
            {data.restrictedExercises.length === 0 && <p className="text-xs text-foreground/40">Sin restricciones cargadas.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Musculatura objetivo y volumen tolerado</h3>
          <button
            type="button"
            onClick={addObjective}
            className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm transition hover:border-accent/35"
          >
            + Músculo
          </button>
        </div>
        <div className="space-y-2">
          {data.objectiveMuscles.map((m) => (
            <div key={m.id} className="grid gap-2 rounded-2xl border border-line bg-surface-strong p-3 md:grid-cols-[1.2fr_0.7fr_1fr_1fr_auto]">
              <input
                value={m.muscle}
                onChange={(e) => updateObjective(m.id, { muscle: e.target.value })}
                placeholder="Músculo"
                className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
              <select
                value={m.priority}
                onChange={(e) => updateObjective(m.id, { priority: e.target.value as ObjectiveMuscleItem["priority"] })}
                className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
              <input
                value={m.idealVolume}
                onChange={(e) => updateObjective(m.id, { idealVolume: e.target.value })}
                placeholder="Volumen ideal"
                className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
              <input
                value={m.maxVolume}
                onChange={(e) => updateObjective(m.id, { maxVolume: e.target.value })}
                placeholder="Volumen máximo"
                className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={() => removeObjective(m.id)}
                className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Maquinaria disponible del gym</h3>
          <span className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs text-foreground/55">
            La completa el atleta
          </span>
        </div>
        <p className="mb-3 text-xs text-foreground/45">Edición disponible en el panel del atleta: /athlete/gym-machines</p>
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
          <input
            value={machineQuery}
            onChange={(e) => setMachineQuery(e.target.value)}
            placeholder="Buscar máquina por nombre, nota o grupo..."
            className="rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
          />
          <select
            value={machineGroupFilter}
            onChange={(e) => setMachineGroupFilter(e.target.value)}
            className="rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
          >
            <option value="all">Todos los grupos</option>
            {MACHINE_GROUP_OPTIONS.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {visibleMachines.map((m) => (
            <div key={m.id} className="rounded-2xl border border-line bg-surface-strong p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_220px_auto]">
                <input
                  value={m.name}
                  onChange={(e) => updateMachine(m.id, { name: e.target.value })}
                  placeholder="Nombre máquina (ej: Prensa inclinada Matrix)"
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <input
                  value={m.brand ?? ""}
                  onChange={(e) => updateMachine(m.id, { brand: e.target.value })}
                  placeholder="Marca"
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <input
                  value={m.model ?? ""}
                  onChange={(e) => updateMachine(m.id, { model: e.target.value })}
                  placeholder="Modelo"
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <select
                  value={m.muscleGroup ?? "Otro"}
                  onChange={(e) => updateMachine(m.id, { muscleGroup: e.target.value })}
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                >
                  {MACHINE_GROUP_OPTIONS.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMachine(m.id)}
                  disabled={machineReadOnly}
                  className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr]">
                <input
                  value={m.note ?? ""}
                  onChange={(e) => updateMachine(m.id, { note: e.target.value })}
                  placeholder="Nota opcional (modelo, sensación, etc.)"
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
                <input
                  value={m.imageUrl ?? ""}
                  onChange={(e) => updateMachine(m.id, { imageUrl: e.target.value })}
                  placeholder="URL imagen (opcional)"
                  disabled={machineReadOnly}
                  className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-foreground/70 transition hover:border-accent/35 cursor-pointer">
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={machineReadOnly}
                    onChange={(e) => uploadMachineImage(m.id, e.target.files?.[0] ?? null)}
                  />
                </label>
                {m.imageUrl ? (
                  <span className="text-xs text-success">Imagen cargada</span>
                ) : (
                  <span className="text-xs text-foreground/45">Sin imagen</span>
                )}
              </div>

              {m.imageUrl ? (
                <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
                  <img src={m.imageUrl} alt={m.name || "Máquina"} className="h-40 w-full object-cover" />
                </div>
              ) : null}
            </div>
          ))}
          {data.gymMachines.length === 0 && (
            <p className="text-xs text-foreground/40">Añade máquinas para priorizar sustitutos compatibles automáticamente.</p>
          )}
          {data.gymMachines.length > 0 && visibleMachines.length === 0 && (
            <p className="text-xs text-foreground/40">No hay máquinas que coincidan con ese filtro.</p>
          )}
          {machineImageError && (
            <p className="text-xs text-danger">{machineImageError}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <h3 className="mb-3 text-lg font-semibold">Guía rápida: técnicas alta intensidad</h3>
          <div className="space-y-2">
            {HI_TECHNIQUES.map((t) => (
              <div key={t.key} className="rounded-2xl border border-line bg-surface-strong p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-foreground/60">RIR {t.rir}</span>
                </div>
                <p className="text-xs text-foreground/55">Uso: {t.use}</p>
                <p className="mt-1 text-xs text-foreground/70">{t.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <h3 className="mb-1 text-lg font-semibold">Calculadora % y @RM</h3>
          <p className="mb-4 text-xs text-foreground/45">Desde un AMRAP validado calcula e1RM (Epley) y tabla de porcentajes.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={amrapLoad}
              onChange={(e) => setAmrapLoad(e.target.value)}
              placeholder="Carga AMRAP (kg)"
              className="rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
            />
            <input
              value={amrapReps}
              onChange={(e) => setAmrapReps(e.target.value)}
              placeholder="Reps AMRAP"
              className="rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
            />
          </div>

          <div className="mt-4 rounded-3xl border border-line bg-surface-strong p-4">
            <p className="text-xs text-foreground/45">1RM teórico estimado</p>
            <p className="text-3xl font-bold text-accent">{e1rm ? `${e1rm} kg` : "—"}</p>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-3xl border border-line bg-surface-strong">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-foreground/45">
                <tr>
                  <th className="px-3 py-2">@RM</th>
                  <th className="px-3 py-2">%</th>
                  <th className="px-3 py-2">Carga</th>
                </tr>
              </thead>
              <tbody>
                {percentRows.map((r) => (
                  <tr key={r.rm} className="border-t border-line">
                    <td className="px-3 py-2 font-semibold">@ {r.rm} RM</td>
                    <td className="px-3 py-2 text-foreground/65">{r.pct}%</td>
                    <td className="px-3 py-2 font-mono">{r.kg} kg</td>
                  </tr>
                ))}
                {percentRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-xs text-foreground/40">Introduce carga y reps válidas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
        <h3 className="mb-2 text-lg font-semibold">Notas internas del coach</h3>
        <textarea
          rows={4}
          value={data.notes}
          onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Resumen de estrategia, observaciones del mesociclo, decisiones de progreso/regresión..."
          className="w-full resize-none rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/coach/athletes/${athleteId}/context/print`}
          target="_blank"
          className="rounded-full border border-line bg-surface-strong px-4 py-3 text-sm transition hover:border-accent/35"
        >
          Exportar PDF
        </Link>
        <button
          type="button"
          onClick={saveContext}
          disabled={saving}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar contexto"}
        </button>
      </div>
    </div>
  );
}
