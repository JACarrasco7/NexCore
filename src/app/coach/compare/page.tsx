"use client";

import { useEffect, useState } from "react";
import { SectionIntro } from "@/components/section-intro";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

type AthleteOption = {
  id: string;
  fullName: string;
  goal: string;
};

type CompareMetric = {
  adherencePct: number | null;
  latestWeightKg: number | null;
  avgSleepH: number | null;
  avgStepsDay: number | null;
  sessionsLast30: number;
  lastCheckIn: {
    date: string;
    weightKg: number | null;
    adherencePct: number | null;
    sleepAvg: number | null;
    moodAvg: number | null;
    fatigueAvg: number | null;
  } | null;
  lastMeasurement: {
    date: string;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
    waistCm: number | null;
  } | null;
};

type CompareResult = {
  id: string;
  fullName: string;
  goal: string;
  phaseLabel: string;
  metrics: CompareMetric;
};

const GOAL_LABELS: Record<string, string> = {
  VOLUMEN: "Volumen",
  DEFINICION: "Definición",
  MANTENIMIENTO: "Mantenimiento",
  PEAK_WEEK: "Peak Week",
};

function MetricCell({ value, unit = "", highlight }: { value: number | null | undefined; unit?: string; highlight?: "best" | "worst" | null }) {
  if (value == null) return <span className="text-foreground/30 text-sm">—</span>;
  return (
    <span className={`text-sm font-medium ${highlight === "best" ? "text-green-600 dark:text-green-400" : highlight === "worst" ? "text-red-500" : ""}`}>
      {value.toFixed(1).replace(/\.0$/, "")}{unit}
    </span>
  );
}

function highlightBest(values: (number | null | undefined)[], higher = true): ("best" | "worst" | null)[] {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => null);
  const best = higher ? Math.max(...valid) : Math.min(...valid);
  const worst = higher ? Math.min(...valid) : Math.max(...valid);
  return values.map((v) =>
    v == null ? null : v === best ? "best" : v === worst ? "worst" : null
  );
}

export default function CompareAthletesPage() {
  const { pushToast } = useToast();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  useEffect(() => {
    fetch("/api/athletes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AthleteOption[]) => setAthletes(data))
      .catch(() => [])
      .finally(() => setLoadingAthletes(false));
  }, []);

  function toggleAthlete(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  }

  async function handleCompare() {
    if (selected.length < 2) {
      pushToast({ title: "Selecciona al menos 2 atletas", variant: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/athletes/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      if (res.ok) setResults(await res.json());
      else {
        const err: { error?: string } = await res.json().catch(() => ({}));
        pushToast({ title: err.error ?? "Error al comparar", variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  const rows: { label: string; key: keyof CompareMetric | string; unit?: string; higher?: boolean }[] = [
    { label: "Adherencia check-ins", key: "adherencePct", unit: "%", higher: true },
    { label: "Peso actual (kg)", key: "latestWeightKg", unit: " kg", higher: false },
    { label: "Sueño promedio", key: "avgSleepH", unit: "h", higher: true },
    { label: "Pasos/día promedio", key: "avgStepsDay", unit: "", higher: true },
    { label: "Sesiones últimos 30d", key: "sessionsLast30", unit: "", higher: true },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <SectionIntro
        eyebrow="Análisis"
        title="Comparar atletas"
        description="Selecciona 2-5 atletas para ver sus métricas lado a lado."
      />

      {/* Selector de atletas */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Seleccionar atletas ({selected.length}/5)</h2>
          {selected.length >= 2 && (
            <button
              onClick={handleCompare}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Comparando..." : "Comparar"}
            </button>
          )}
        </div>

        {loadingAthletes ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : athletes.length === 0 ? (
          <p className="text-sm text-foreground/50">Sin atletas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {athletes.map((a) => {
              const isSelected = selected.includes(a.id);
              const isDisabled = !isSelected && selected.length >= 5;
              return (
                <button
                  key={a.id}
                  onClick={() => !isDisabled && toggleAthlete(a.id)}
                  disabled={isDisabled}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-line bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="block truncate font-medium">{a.fullName}</span>
                  <span className="text-xs text-foreground/50">{GOAL_LABELS[a.goal] ?? a.goal}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla comparativa */}
      {results && results.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-3 pr-4 font-medium text-foreground/60 text-xs">Métrica</th>
                {results.map((r) => (
                  <th key={r.id} className="text-center py-3 px-3 font-semibold min-w-[120px]">
                    <span className="block truncate">{r.fullName}</span>
                    <span className="text-xs font-normal text-foreground/50">{r.phaseLabel}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {rows.map((row) => {
                const values = results.map((r) => {
                  const v = r.metrics[row.key as keyof CompareMetric];
                  return typeof v === "number" ? v : null;
                });
                const highlights = highlightBest(values, row.higher ?? true);
                return (
                  <tr key={row.key} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 pr-4 text-xs text-foreground/60 font-medium whitespace-nowrap">{row.label}</td>
                    {results.map((r, i) => (
                      <td key={r.id} className="text-center py-3 px-3">
                        <MetricCell
                          value={r.metrics[row.key as keyof CompareMetric] as number | null}
                          unit={row.unit}
                          highlight={highlights[i]}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Último check-in */}
              <tr className="hover:bg-surface/50">
                <td className="py-3 pr-4 text-xs text-foreground/60 font-medium">Último check-in</td>
                {results.map((r) => (
                  <td key={r.id} className="text-center py-3 px-3">
                    <span className="text-xs text-foreground/50">
                      {r.metrics.lastCheckIn ? new Date(r.metrics.lastCheckIn.date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* % grasa */}
              {results.some((r) => r.metrics.lastMeasurement?.bodyFatPct != null) && (() => {
                const vals = results.map((r) => r.metrics.lastMeasurement?.bodyFatPct ?? null);
                const hl = highlightBest(vals, false);
                return (
                  <tr className="hover:bg-surface/50">
                    <td className="py-3 pr-4 text-xs text-foreground/60 font-medium">% grasa corporal</td>
                    {results.map((r, i) => (
                      <td key={r.id} className="text-center py-3 px-3">
                        <MetricCell value={r.metrics.lastMeasurement?.bodyFatPct ?? null} unit="%" highlight={hl[i]} />
                      </td>
                    ))}
                  </tr>
                );
              })()}

              {/* masa muscular */}
              {results.some((r) => r.metrics.lastMeasurement?.muscleMassKg != null) && (() => {
                const vals = results.map((r) => r.metrics.lastMeasurement?.muscleMassKg ?? null);
                const hl = highlightBest(vals, true);
                return (
                  <tr className="hover:bg-surface/50">
                    <td className="py-3 pr-4 text-xs text-foreground/60 font-medium">Masa muscular (kg)</td>
                    {results.map((r, i) => (
                      <td key={r.id} className="text-center py-3 px-3">
                        <MetricCell value={r.metrics.lastMeasurement?.muscleMassKg ?? null} unit=" kg" highlight={hl[i]} />
                      </td>
                    ))}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
