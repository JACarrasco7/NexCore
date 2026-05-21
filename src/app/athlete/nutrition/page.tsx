"use client";
export const dynamic = 'force-dynamic'

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNutritionPlans } from "@/lib/store";
import { SectionIntro } from "@/components/section-intro";
import { Skeleton } from "@/components/ui/skeleton";
import type { Meal, NutritionPlan } from "@/lib/domain";

function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-foreground/60">
        <span>{label}</span>
        <span>{value}g</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false);

  const mealKcal = meal.foods.reduce((s, f) => s + (f.kcal ?? 0), 0);
  const mealProt = meal.foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);
  const mealCarbs = meal.foods.reduce((s, f) => s + (f.carbsG ?? 0), 0);
  const mealFat = meal.foods.reduce((s, f) => s + (f.fatG ?? 0), 0);

  return (
    <div className="rounded-3xl border border-line bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent-soft"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{meal.name}</span>
          {meal.time && (
            <span className="text-xs text-foreground/40">{meal.time}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/50">{mealKcal} kcal</span>
          <span className="text-xs text-accent/60">
            P {Math.round(mealProt)}g · C {Math.round(mealCarbs)}g · G {Math.round(mealFat)}g
          </span>
          <span className="text-foreground/40">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-foreground/40">
                <th className="px-4 py-2 text-left font-normal">Alimento</th>
                <th className="px-3 py-2 text-right font-normal">Cantidad</th>
                <th className="px-3 py-2 text-right font-normal">kcal</th>
                <th className="px-3 py-2 text-right font-normal">P</th>
                <th className="px-3 py-2 text-right font-normal">C</th>
                <th className="px-3 py-2 text-right font-normal">G</th>
              </tr>
            </thead>
            <tbody>
              {meal.foods.map((f) => (
                <tr key={f.id} className="border-t border-line/40">
                  <td className="px-4 py-2 text-foreground">{f.food}</td>
                  <td className="px-3 py-2 text-right text-foreground/60">
                    {f.quantity} {f.unit}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground/60">
                    {f.kcal ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-success">
                    {f.proteinG != null ? `${f.proteinG}g` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-(--macro-carbs)">
                    {f.carbsG != null ? `${f.carbsG}g` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-warning">
                    {f.fatG != null ? `${f.fatG}g` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlanSelector({
  plans,
  selected,
  onSelect,
}: {
  plans: NutritionPlan[];
  selected: NutritionPlan;
  onSelect: (p: NutritionPlan) => void;
}) {
  if (plans.length <= 1) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {plans.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            p.id === selected.id
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-line text-foreground/60 hover:border-line/60 hover:text-foreground"
          }`}
        >
          {p.title}
        </button>
      ))}
    </div>
  );
}

function NutritionContent() {
  const searchParams = useSearchParams();
  const athleteIdParam = searchParams.get("athleteId") ?? undefined;

  const { plans, activePlan, loading } = useNutritionPlans(athleteIdParam);
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null);

  const plan = selectedPlan ?? activePlan;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
        <div className="text-4xl">🥗</div>
        <p className="text-foreground/60">
          No tienes ningún plan nutricional asignado aún.
        </p>
        <p className="text-sm text-foreground/40">
          Tu coach lo creará en breve.
        </p>
      </div>
    );
  }

  const totalKcal = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.kcal ?? 0), 0),
    0
  );
  const totalProt = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.proteinG ?? 0), 0),
    0
  );
  const totalCarbs = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.carbsG ?? 0), 0),
    0
  );
  const totalFat = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.fatG ?? 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      <PlanSelector
        plans={plans}
        selected={plan}
        onSelect={setSelectedPlan}
      />

      {/* Header plan */}
      <div className="rounded-4xl border border-line bg-surface p-6">
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{plan.title}</h2>
            <span className="text-sm text-foreground/50">{plan.phase}</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{plan.kcalTarget}</div>
            <div className="text-xs text-foreground/40">kcal objetivo</div>
          </div>
        </div>

        {plan.notes && (
          <p className="mt-3 rounded-lg bg-background/50 px-4 py-3 text-sm text-foreground/70">
            {plan.notes}
          </p>
        )}

        {/* Macros */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-success/10 p-3">
            <div className="text-xl font-bold text-success">{plan.proteinG}g</div>
            <div className="text-xs text-foreground/50">Proteína</div>
          </div>
          <div className="rounded-xl bg-(--macro-carbs)/10 p-3">
            <div className="text-xl font-bold text-(--macro-carbs)">{plan.carbsG}g</div>
            <div className="text-xs text-foreground/50">Carbos</div>
          </div>
          <div className="rounded-xl bg-warning/10 p-3">
            <div className="text-xl font-bold text-warning">{plan.fatG}g</div>
            <div className="text-xs text-foreground/50">Grasas</div>
          </div>
        </div>

        {/* Barras de macros reales vs objetivo */}
        <div className="mt-4 space-y-2">
          <MacroBar label="Proteína real" value={Math.round(totalProt)} max={plan.proteinG} color="bg-success" />
          <MacroBar label="Carbos reales" value={Math.round(totalCarbs)} max={plan.carbsG} color="bg-(--macro-carbs)" />
          <MacroBar label="Grasas reales" value={Math.round(totalFat)} max={plan.fatG} color="bg-warning" />
        </div>

        <p className="mt-3 text-right text-xs text-foreground/40">
          Total calculado: {Math.round(totalKcal)} kcal · P {Math.round(totalProt)}g · C {Math.round(totalCarbs)}g · G {Math.round(totalFat)}g
        </p>
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40">
          {plan.meals.length} comidas
        </h3>
        {plan.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </div>
    </div>
  );
}

export default function NutritionPage() {
  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Nutricion"
        title="Plan nutricional"
        description="Dieta personalizada creada por tu coach."
      />
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>}>
        <NutritionContent />
      </Suspense>
    </main>
  );
}
