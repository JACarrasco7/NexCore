"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type NutritionLog = {
  id: string;
  loggedAt: string;
  mealName: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type NutritionMeal = {
  kcalTarget: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type NutritionPlan = {
  id: string;
  title: string;
  kcalTarget: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  meals: NutritionMeal[];
};

function ComplianceBar({ label, logged, target, color }: { label: string; logged: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(Math.round((logged / target) * 100), 150) : 0;
  const displayPct = target > 0 ? Math.round((logged / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-foreground/60">{label}</span>
        <span className={`font-medium ${displayPct >= 90 && displayPct <= 110 ? "text-green-600 dark:text-green-400" : displayPct < 80 ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>
          {logged.toFixed(0)} / {target.toFixed(0)} ({displayPct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-line/30">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function NutritionComplianceTab({ athleteId }: { athleteId: string }) {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [logsRes, plansRes] = await Promise.all([
          fetch(`/api/nutrition-logs?athleteId=${athleteId}`),
          fetch(`/api/nutrition-plans?athleteId=${athleteId}`),
        ]);
        if (logsRes.ok) {
          const payload = await logsRes.json() as { items?: NutritionLog[] } | NutritionLog[];
          setLogs(Array.isArray(payload) ? payload : (payload.items ?? []));
        }
        if (plansRes.ok) {
          const plans: NutritionPlan[] = await plansRes.json();
          setPlan(plans[0] ?? null);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [athleteId]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>;

  // Agrupar logs por día (últimos 7 días)
  const today = new Date();
  const days: { date: string; logs: NutritionLog[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, logs: logs.filter((l) => l.loggedAt.startsWith(dateStr)) });
  }

  // Totales plan (suma de comidas si existen, o campos directos del plan)
  const planKcal = plan
    ? (plan.meals.length > 0
        ? plan.meals.reduce((s, m) => s + (m.kcalTarget ?? 0), 0)
        : (plan.kcalTarget ?? 0))
    : 0;
  const planProtein = plan
    ? (plan.meals.length > 0
        ? plan.meals.reduce((s, m) => s + (m.proteinG ?? 0), 0)
        : (plan.proteinG ?? 0))
    : 0;
  const planCarbs = plan
    ? (plan.meals.length > 0
        ? plan.meals.reduce((s, m) => s + (m.carbsG ?? 0), 0)
        : (plan.carbsG ?? 0))
    : 0;
  const planFat = plan
    ? (plan.meals.length > 0
        ? plan.meals.reduce((s, m) => s + (m.fatG ?? 0), 0)
        : (plan.fatG ?? 0))
    : 0;

  // Promedio últimos 7 días
  const daysWithLogs = days.filter((d) => d.logs.length > 0);
  const avgKcal = daysWithLogs.length > 0
    ? daysWithLogs.reduce((s, d) => s + d.logs.reduce((ss, l) => ss + (l.kcal ?? 0), 0), 0) / daysWithLogs.length
    : 0;
  const avgProtein = daysWithLogs.length > 0
    ? daysWithLogs.reduce((s, d) => s + d.logs.reduce((ss, l) => ss + (l.proteinG ?? 0), 0), 0) / daysWithLogs.length
    : 0;
  const avgCarbs = daysWithLogs.length > 0
    ? daysWithLogs.reduce((s, d) => s + d.logs.reduce((ss, l) => ss + (l.carbsG ?? 0), 0), 0) / daysWithLogs.length
    : 0;
  const avgFat = daysWithLogs.length > 0
    ? daysWithLogs.reduce((s, d) => s + d.logs.reduce((ss, l) => ss + (l.fatG ?? 0), 0), 0) / daysWithLogs.length
    : 0;

  const hasPlan = plan && planKcal > 0;

  return (
    <div className="space-y-6">
      {/* Compliance vs plan */}
      {hasPlan ? (
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h3 className="font-semibold text-sm">Compliance vs plan (promedio 7 días)</h3>
          {daysWithLogs.length === 0 ? (
            <p className="text-sm text-foreground/50">Sin registros de comidas en los últimos 7 días.</p>
          ) : (
            <div className="space-y-3">
              <ComplianceBar label="Calorías" logged={avgKcal} target={planKcal} color="bg-primary" />
              <ComplianceBar label="Proteína" logged={avgProtein} target={planProtein} color="bg-blue-500" />
              <ComplianceBar label="Carbos" logged={avgCarbs} target={planCarbs} color="bg-yellow-500" />
              <ComplianceBar label="Grasas" logged={avgFat} target={planFat} color="bg-orange-500" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm text-foreground/50">Sin plan de nutrición asignado. No se puede calcular compliance.</p>
        </div>
      )}

      {/* Historial por día */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground/70">Últimos 7 días</h3>
        {days.map(({ date, logs: dayLogs }) => {
          const kcalTotal = dayLogs.reduce((s, l) => s + (l.kcal ?? 0), 0);
          const protTotal = dayLogs.reduce((s, l) => s + (l.proteinG ?? 0), 0);
          const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
          return (
            <div key={date} className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3">
              <div className="w-28 flex-shrink-0">
                <span className="text-xs text-foreground/60 capitalize">{dateLabel}</span>
              </div>
              {dayLogs.length === 0 ? (
                <span className="text-xs text-foreground/30">Sin registros</span>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="font-semibold">{kcalTotal.toFixed(0)} kcal</span>
                  <span className="text-blue-600 dark:text-blue-400">{protTotal.toFixed(0)}g prot</span>
                  <span className="text-foreground/50">{dayLogs.length} comidas</span>
                  {hasPlan && planKcal > 0 && (
                    <span className={`font-medium ${Math.abs((kcalTotal / planKcal) - 1) < 0.1 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                      {Math.round((kcalTotal / planKcal) * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
