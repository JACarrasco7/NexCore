"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAthletes } from "@/lib/store";
import { useCoachMe } from "@/lib/use-coach-me";
import type { AthleteProfile } from "@/lib/domain";

type CatalogGoal = { code: string; label: string; isVisible: boolean };

// Visual tones stay local — not in the catalog API
const GOAL_TONES: Record<string, string> = {
  volumen:       "bg-success/10 text-success border-success/30",
  definicion:    "bg-warning/10 text-warning border-warning/30",
  mantenimiento: "bg-surface-strong text-foreground/50 border-line",
  "peak-week":   "bg-danger/10 text-danger border-danger/30",
};

const FALLBACK_GOALS: CatalogGoal[] = [
  { code: "volumen",       label: "Volumen",       isVisible: true },
  { code: "definicion",    label: "Definición",    isVisible: true },
  { code: "mantenimiento", label: "Mantenimiento", isVisible: true },
  { code: "peak-week",     label: "Peak Week",     isVisible: true },
];

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditAthleteModal({
  athlete,
  goals,
  onSave,
  onClose,
}: {
  athlete: AthleteProfile;
  goals: CatalogGoal[];
  onSave: (id: string, data: Partial<AthleteProfile>) => Promise<void>;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(athlete.fullName);
  const [goal, setGoal] = useState(athlete.goal);
  const [phaseLabel, setPhaseLabel] = useState(athlete.phaseLabel);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(athlete.id, { fullName, goal: goal as AthleteProfile["goal"], phaseLabel });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Editar atleta"
      description="Actualiza los datos principales del atleta."
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-3 text-sm font-medium transition hover:bg-surface-strong">
            Cancelar
          </button>
          <button form="edit-athlete-form" type="submit" disabled={saving} className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}
    >
      <form id="edit-athlete-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/60">Nombre completo</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/60">Objetivo</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as AthleteProfile["goal"])} className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent">
            {goals.filter((g) => g.isVisible).map((g) => (
              <option key={g.code} value={g.code}>{g.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground/60">Etiqueta de fase</label>
          <input type="text" value={phaseLabel} onChange={(e) => setPhaseLabel(e.target.value)} placeholder="ej. Semana 4 · Acumulación" className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" />
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AthletesPage() {
  const { coach } = useCoachMe();
  const { athletes, updateAthlete } = useAthletes(coach?.id);
  const { pushToast } = useToast();
  const [editTarget, setEditTarget] = useState<AthleteProfile | null>(null);
  const [search, setSearch] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [catalogGoals, setCatalogGoals] = useState<CatalogGoal[]>(FALLBACK_GOALS);

  useEffect(() => {
    fetch("/api/teams/catalog")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { goals?: Array<{ code: string; label: string; isVisible: boolean }> } | null) => {
        if (!data?.goals?.length) return;
        // API returns codes in UPPERCASE; normalize to lowercase-dash for matching athlete.goal
        const mapped: CatalogGoal[] = data.goals.map((g) => ({
          code: g.code.toLowerCase().replace("_", "-"),
          label: g.label,
          isVisible: g.isVisible,
        }));
        setCatalogGoals(mapped);
      })
      .catch(() => void 0);
  }, []);

  const filtered = athletes.filter((a) => {
    const matchSearch = a.fullName.toLowerCase().includes(search.toLowerCase());
    const matchGoal = goalFilter ? a.goal === goalFilter : true;
    return matchSearch && matchGoal;
  });

  async function handleSave(id: string, data: Partial<AthleteProfile>) {
    await updateAthlete(id, data);
    pushToast({ title: "Atleta actualizado", variant: "success" });
  }

  return (
    <>
      {editTarget && (
        <EditAthleteModal athlete={editTarget} goals={catalogGoals} onSave={handleSave} onClose={() => setEditTarget(null)} />
      )}

      <div className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/40">Coach dashboard</p>
            <h1 className="mt-1 text-2xl font-bold">Atletas</h1>
          </div>
          <Link href="/athlete/onboarding" className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
            + Alta atleta
          </Link>
        </div>

        {/* Split layout: aside filtros + main lista */}
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">

          {/* Aside: filtros */}
          <aside className="space-y-4 xl:sticky xl:top-24">
            <div className="rounded-2xl border border-line bg-surface-strong p-4 space-y-3">
              <p className="text-xs uppercase tracking-widest text-foreground/45">Buscar</p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre del atleta..."
                className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
            </div>

            <div className="rounded-2xl border border-line bg-surface-strong p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-foreground/45 mb-1">Objetivo</p>
              <button
                onClick={() => setGoalFilter("")}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${!goalFilter ? "bg-accent/10 text-accent font-semibold" : "hover:bg-background"}`}
              >
                Todos ({athletes.length})
              </button>
              {catalogGoals.filter((g) => g.isVisible).map((g) => {
                const count = athletes.filter((a) => a.goal === g.code).length;
                return (
                  <button
                    key={g.code}
                    onClick={() => setGoalFilter(goalFilter === g.code ? "" : g.code)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${goalFilter === g.code ? "bg-accent/10 text-accent font-semibold" : "hover:bg-background"}`}
                  >
                    <span>{g.label}</span>
                    <span className="text-xs text-foreground/40">{count}</span>
                  </button>
                );
              })}
            </div>

            {(search || goalFilter) && (
              <button
                onClick={() => { setSearch(""); setGoalFilter(""); }}
                className="w-full rounded-xl border border-line py-2 text-xs text-foreground/50 transition hover:text-foreground"
              >
                Limpiar filtros
              </button>
            )}
          </aside>

          {/* Main: lista compacta */}
          <div>
            {athletes.length === 0 ? (
              <EmptyState
                title="Sin atletas todavía"
                description="Da de alta al primer atleta desde el flujo de onboarding."
                icon="👥"
                action={(
                  <Link href="/athlete/onboarding" className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong">
                    Comenzar onboarding
                  </Link>
                )}
                className="rounded-2xl py-20"
              />
            ) : filtered.length === 0 ? (
              <EmptyState title="Sin resultados" description="Prueba otra búsqueda o limpia los filtros." className="rounded-2xl py-12" />
            ) : (
              <div className="rounded-2xl border border-line bg-surface-strong overflow-hidden">
                <div className="hidden grid-cols-[1fr_120px_120px_auto] gap-4 border-b border-line px-5 py-2.5 text-[11px] uppercase tracking-widest text-foreground/40 sm:grid">
                  <span>Atleta</span>
                  <span>Objetivo</span>
                  <span>Fase</span>
                  <span></span>
                </div>
                <div className="divide-y divide-line">
                  {filtered.map((athlete) => {
                    const goalMeta = catalogGoals.find((g) => g.code === athlete.goal);
                    return (
                      <div key={athlete.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 transition hover:bg-background/40 sm:grid-cols-[1fr_120px_120px_auto]">
                        {/* Name + avatar */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
                            {athlete.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{athlete.fullName}</p>
                            {athlete.healthConnections.length > 0 && (
                              <p className="text-xs text-foreground/40">{athlete.healthConnections.join(", ")}</p>
                            )}
                          </div>
                        </div>
                        {/* Goal badge */}
                        <span className={`hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:inline-block ${GOAL_TONES[athlete.goal] ?? "bg-surface-strong text-foreground/50 border-line"}`}>
                          {goalMeta?.label ?? athlete.goal}
                        </span>
                        {/* Phase */}
                        <span className="hidden text-xs text-foreground/50 sm:block truncate">{athlete.phaseLabel || "—"}</span>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <Link href={`/coach/athletes/${athlete.id}`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition hover:border-accent/40 hover:text-accent">
                            Abrir
                          </Link>
                          <button
                            onClick={() => setEditTarget(athlete)}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-xs transition hover:border-accent/40 hover:text-accent"
                            title="Editar"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
