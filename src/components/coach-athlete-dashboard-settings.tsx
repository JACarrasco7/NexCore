"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, apiPost } from '@/lib/store'

import { DEFAULT_LAYOUT, TAB_META, type LayoutState, type TabKey } from "@/lib/dashboard-config";
import { useToast } from "@/components/ui/toast";

type NutritionTarget = {
  athleteId: string;
  mode: "FIXED" | "FLEXIBLE";
  source: string;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function CoachAthleteDashboardSettings({ athleteId }: { athleteId: string }) {
  const { data: session } = useSession();
  const { pushToast } = useToast();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [layoutSource, setLayoutSource] = useState("default");
  const [targets, setTargets] = useState<NutritionTarget>({
    athleteId,
    mode: "FLEXIBLE",
    source: "default",
    kcalTarget: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  useEffect(() => {
    if (role !== "COACH" && role !== "ADMIN") return;
    let active = true;

    async function load() {
      try {
        const [presetData, targetData] = await Promise.all([
          apiFetch<{ source: string; layout: LayoutState } | null>(`/api/dashboard/preset?athleteId=${athleteId}`).catch(() => null),
          apiFetch<NutritionTarget | null>(`/api/nutrition-targets?athleteId=${athleteId}`).catch(() => null),
        ])

        if (!active) return;

        if (presetData) {
          setLayout(presetData.layout)
          setLayoutSource(presetData.source)
        }

        if (targetData) {
          setTargets(targetData)
        }

        setLoading(false)
      } catch (err) {
        // ignore
        setLoading(false)
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [athleteId, role]);

  if (role !== "COACH" && role !== "ADMIN") return null;

  async function savePreset() {
    setSavingPreset(true);
    try {
      await apiPost("/api/dashboard/preset", { athleteId, ...layout });
      setLayoutSource("preset");
      pushToast({ title: "Vista inicial guardada", variant: "success" });
    } catch {
      pushToast({ title: "No se pudo guardar la vista inicial", variant: "error" });
    } finally {
      setSavingPreset(false);
    }
  }

  async function saveTargets() {
    setSavingTargets(true);
    try {
      const payload = await apiPost<NutritionTarget>("/api/nutrition-targets", targets);
      setTargets(payload);
      pushToast({ title: "Objetivos diarios guardados", variant: "success" });
    } catch {
      pushToast({ title: "No se pudieron guardar los objetivos", variant: "error" });
    } finally {
      setSavingTargets(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Dashboard inicial</p>
            <h2 className="mt-2 text-xl font-semibold">Vista por defecto del atleta</h2>
          </div>
          <span className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs text-foreground/55">
            {layoutSource}
          </span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {TAB_META.map((tab) => {
            const active = layout.activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLayout((current) => ({ ...current, activeTab: tab.key as TabKey }))}
                className={`rounded-3xl border px-4 py-3 text-left transition ${active ? "border-accent/35 bg-accent/10" : "border-line bg-surface-strong hover:border-accent/25"}`}
              >
                <p className="text-sm font-semibold text-foreground">{tab.label}</p>
                <p className="mt-1 text-xs text-foreground/50">{tab.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLayout(DEFAULT_LAYOUT)}
            className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-accent/35"
          >
            Restaurar preset
          </button>
          <button
            type="button"
            onClick={() => void savePreset()}
            disabled={loading || savingPreset}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {savingPreset ? "Guardando..." : "Guardar vista inicial"}
          </button>
        </div>
      </article>

      <article className="rounded-4xl border border-line bg-surface p-6 shadow-[0_16px_48px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Objetivos diarios</p>
            <h2 className="mt-2 text-xl font-semibold">Kcal y macros objetivo</h2>
          </div>
          <span className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs text-foreground/55">
            {targets.mode === "FIXED" ? "Dieta fija" : "Macros flexibles"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="rounded-3xl border border-line bg-surface-strong p-4 xl:col-span-1">
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/40">Modo</span>
            <select
              value={targets.mode}
              onChange={(event) => setTargets((current) => ({ ...current, mode: event.target.value as NutritionTarget["mode"] }))}
              className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="FLEXIBLE">Macros flexibles</option>
              <option value="FIXED">Dieta fija</option>
            </select>
          </label>
          <label className="rounded-3xl border border-line bg-surface-strong p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/40">Kcal</span>
            <input type="number" value={targets.kcalTarget} onChange={(event) => setTargets((current) => ({ ...current, kcalTarget: Number(event.target.value) }))} className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
          </label>
          <label className="rounded-3xl border border-line bg-surface-strong p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/40">Proteína</span>
            <input type="number" value={targets.proteinG} onChange={(event) => setTargets((current) => ({ ...current, proteinG: Number(event.target.value) }))} className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
          </label>
          <label className="rounded-3xl border border-line bg-surface-strong p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/40">Carbs</span>
            <input type="number" value={targets.carbsG} onChange={(event) => setTargets((current) => ({ ...current, carbsG: Number(event.target.value) }))} className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
          </label>
          <label className="rounded-3xl border border-line bg-surface-strong p-4">
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/40">Grasas</span>
            <input type="number" value={targets.fatG} onChange={(event) => setTargets((current) => ({ ...current, fatG: Number(event.target.value) }))} className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground/55">Fuente actual: {targets.source}</p>
          <button
            type="button"
            onClick={() => void saveTargets()}
            disabled={loading || savingTargets}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {savingTargets ? "Guardando..." : "Guardar objetivos"}
          </button>
        </div>
      </article>
    </section>
  );
}
