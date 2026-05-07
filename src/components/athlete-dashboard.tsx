"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { SectionIntro } from "@/components/section-intro";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_LAYOUT, TAB_META, WIDGET_LABELS, type LayoutState, type TabKey, type WidgetKey } from "@/lib/dashboard-config";

type AthleteProfile = {
  id: string;
  fullName: string;
  goal: string;
  phaseLabel: string;
  latestWeightKg: number | null;
};

type DailyLogRow = {
  date: string;
  weightKg: number | null;
  sleepHours: number | null;
  steps: number | null;
  waistCm: number | null;
  bodyFatPct: number | null;
};

type CheckInRow = {
  date: string;
  weekLabel: string;
  weightKg: number;
  adherencePct: number;
  sleepHours: number;
  stepsAvg: number;
};

type NutritionLogRow = {
  loggedAt: string;
  mealName: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type SessionLogRow = {
  id: string;
  date: string;
  sessionName: string;
  durationMin: number | null;
  kcalBurned: number | null;
};

type NutritionTarget = {
  athleteId: string;
  mode: "FIXED" | "FLEXIBLE";
  source: string;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type DashboardData = {
  profile: AthleteProfile;
  target: NutritionTarget;
  dailyLogs: DailyLogRow[];
  checkIns: CheckInRow[];
  nutritionLogs: NutritionLogRow[];
  sessionLogs: SessionLogRow[];
};

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatNumber(value: number | null, suffix = "") {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value}${suffix}`;
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && !Number.isNaN(value));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((total, value) => total + value, 0) / valid.length) * 10) / 10;
}

function sum(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && !Number.isNaN(value));
  if (valid.length === 0) return 0;
  return valid.reduce((total, value) => total + value, 0);
}

function startOfDayIso(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function MiniBars({ values, labels, suffix = "", tone = "accent" }: { values: number[]; labels: string[]; suffix?: string; tone?: "accent" | "success" | "warning"; }) {
  const max = Math.max(...values, 1);
  const colorClass = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-accent";

  return (
    <div className="grid grid-cols-7 gap-2 rounded-[28px] border border-line/70 bg-surface-strong/60 p-3">
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end rounded-2xl bg-background/70 px-1.5 py-1.5">
            <div
              className={`w-full rounded-xl ${colorClass} transition-all`}
              style={{ height: `${Math.max(10, (value / max) * 100)}%` }}
              title={`${labels[index]}: ${value}${suffix}`}
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold text-foreground/75">{value}{suffix}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/35">{labels[index]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetCard({
  title,
  description,
  children,
  onMoveUp,
  onMoveDown,
  onToggle,
  canMoveUp,
  canMoveDown,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <article className="rounded-4xl border border-line bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-foreground/55">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Mover widget arriba"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-accent/35 disabled:opacity-40"
          >
            Subir
          </button>
          <button
            type="button"
            aria-label="Mover widget abajo"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-accent/35 disabled:opacity-40"
          >
            Bajar
          </button>
          <button
            type="button"
            aria-label="Ocultar widget"
            onClick={onToggle}
            className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-accent/35"
          >
            Ocultar
          </button>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function AthleteDashboard() {
  const { pushToast } = useToast();
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const [layoutResponse, profileResponse] = await Promise.all([
        fetch("/api/dashboard/layout").catch(() => null),
        fetch("/api/me/athlete").catch(() => null),
      ]);

      if (layoutResponse?.ok) {
        const layoutPayload = await layoutResponse.json() as { layout: LayoutState };
        if (active) setLayout(layoutPayload.layout);
      }
      if (active) setLayoutReady(true);

      if (!profileResponse?.ok) {
        if (active) setLoading(false);
        return;
      }

      const profile = await profileResponse.json() as AthleteProfile;
      const query = `athleteId=${profile.id}`;

      const [dailyLogsResponse, checkInsResponse, nutritionResponse, sessionsResponse, targetResponse] = await Promise.all([
        fetch(`/api/daily-logs?${query}`).catch(() => null),
        fetch(`/api/check-ins?${query}`).catch(() => null),
        fetch(`/api/nutrition-logs?${query}`).catch(() => null),
        fetch(`/api/session-logs?${query}`).catch(() => null),
        fetch("/api/nutrition-targets").catch(() => null),
      ]);

      if (!active) return;

      const nutritionJson = nutritionResponse?.ok
        ? (await nutritionResponse.json() as { items?: NutritionLogRow[] } | NutritionLogRow[])
        : null;
      const nutritionLogs: NutritionLogRow[] = nutritionJson == null
        ? []
        : Array.isArray(nutritionJson)
          ? nutritionJson
          : (nutritionJson.items ?? []);

      setData({
        profile,
        target: targetResponse?.ok ? await targetResponse.json() as NutritionTarget : { athleteId: profile.id, mode: "FLEXIBLE", source: "default", kcalTarget: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        dailyLogs: dailyLogsResponse?.ok ? await dailyLogsResponse.json() as DailyLogRow[] : [],
        checkIns: checkInsResponse?.ok ? await checkInsResponse.json() as CheckInRow[] : [],
        nutritionLogs,
        sessionLogs: sessionsResponse?.ok ? await sessionsResponse.json() as SessionLogRow[] : [],
      });
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/dashboard/layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [layout, layoutReady]);

  const activeTab = layout.activeTab;

  const metrics = useMemo(() => {
    if (!data) return null;

    const today = startOfDayIso();
    const sevenDaily = data.dailyLogs.slice(0, 7).reverse();
    const sevenSessions = data.sessionLogs.slice(0, 7).reverse();
    const sevenNutrition = data.nutritionLogs.slice(0, 7);
    const todayNutrition = data.nutritionLogs.filter((item) => item.loggedAt.slice(0, 10) === today);
    const latestCheckIn = data.checkIns[0] ?? null;
    const latestDaily = data.dailyLogs[0] ?? null;

    return {
      latestCheckIn,
      latestDaily,
      sessions7d: data.sessionLogs.filter((item) => {
        const date = new Date(item.date);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        return date >= cutoff;
      }),
      avgSleep7d: average(sevenDaily.map((item) => item.sleepHours)),
      avgSteps7d: average(sevenDaily.map((item) => item.steps)),
      avgAdherence: average(data.checkIns.slice(0, 4).map((item) => item.adherencePct)),
      todayNutrition: {
        kcal: sum(todayNutrition.map((item) => item.kcal)),
        protein: sum(todayNutrition.map((item) => item.proteinG)),
        carbs: sum(todayNutrition.map((item) => item.carbsG)),
        fat: sum(todayNutrition.map((item) => item.fatG)),
        meals: todayNutrition.length,
      },
      nutritionTarget: data.target,
      weeklyNutrition: {
        kcal: average(sevenNutrition.map((item) => item.kcal)),
        protein: average(sevenNutrition.map((item) => item.proteinG)),
        carbs: average(sevenNutrition.map((item) => item.carbsG)),
        fat: average(sevenNutrition.map((item) => item.fatG)),
        complianceKcal: data.target.kcalTarget > 0 ? Math.round((sum(sevenNutrition.map((item) => item.kcal)) / Math.max(1, sevenNutrition.length)) / data.target.kcalTarget * 100) : null,
        complianceProtein: data.target.proteinG > 0 ? Math.round((sum(sevenNutrition.map((item) => item.proteinG)) / Math.max(1, sevenNutrition.length)) / data.target.proteinG * 100) : null,
        complianceCarbs: data.target.carbsG > 0 ? Math.round((sum(sevenNutrition.map((item) => item.carbsG)) / Math.max(1, sevenNutrition.length)) / data.target.carbsG * 100) : null,
        complianceFat: data.target.fatG > 0 ? Math.round((sum(sevenNutrition.map((item) => item.fatG)) / Math.max(1, sevenNutrition.length)) / data.target.fatG * 100) : null,
      },
      weightSeries: sevenDaily.map((item) => ({
        label: formatShortDate(item.date),
        value: item.weightKg ?? 0,
      })),
      sleepSeries: sevenDaily.map((item) => ({
        label: formatShortDate(item.date),
        value: Math.round((item.sleepHours ?? 0) * 10) / 10,
      })),
      stepsSeries: sevenDaily.map((item) => ({
        label: formatShortDate(item.date),
        value: item.steps ?? 0,
      })),
      durationSeries: sevenSessions.map((item) => ({
        label: formatShortDate(item.date),
        value: item.durationMin ?? 0,
      })),
      adherenceSeries: data.checkIns.slice(0, 8).reverse().map((item) => ({
        label: item.weekLabel ?? formatShortDate(item.date),
        adherencia: item.adherencePct,
        sueno: item.sleepHours,
      })),
      macroSeries: (() => {
        const byDay: Record<string, { kcal: number; proteina: number; carbs: number; grasa: number }> = {};
        for (const item of data.nutritionLogs) {
          const day = item.loggedAt.slice(0, 10);
          if (!byDay[day]) byDay[day] = { kcal: 0, proteina: 0, carbs: 0, grasa: 0 };
          byDay[day].kcal += item.kcal ?? 0;
          byDay[day].proteina += item.proteinG ?? 0;
          byDay[day].carbs += item.carbsG ?? 0;
          byDay[day].grasa += item.fatG ?? 0;
        }
        return Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-7)
          .map(([day, vals]) => ({
            label: formatShortDate(day),
            kcal: Math.round(vals.kcal),
            proteina: Math.round(vals.proteina),
            carbs: Math.round(vals.carbs),
            grasa: Math.round(vals.grasa),
          }));
      })(),
      sleepSessionCorrelation: (() => {
        const sessionMap: Record<string, number> = {};
        for (const s of data.sessionLogs) {
          const day = s.date.slice(0, 10);
          sessionMap[day] = (sessionMap[day] ?? 0) + (s.durationMin ?? 0);
        }
        return data.dailyLogs.slice(0, 10).reverse().map((item) => ({
          label: formatShortDate(item.date),
          sueno: item.sleepHours ?? 0,
          entrenamiento: sessionMap[item.date.slice(0, 10)] ?? 0,
        }));
      })(),
    };
  }, [data]);

  function setActiveTab(tab: TabKey) {
    setLayout((current) => ({ ...current, activeTab: tab }));
  }

  function moveWidget(tab: TabKey, widget: WidgetKey, direction: -1 | 1) {
    setLayout((current) => {
      const items = [...current.order[tab]];
      const index = items.indexOf(widget);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= items.length) return current;
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...current, order: { ...current.order, [tab]: items } };
    });
  }

  function toggleWidget(widget: WidgetKey) {
    setLayout((current) => {
      const hidden = current.hidden.includes(widget)
        ? current.hidden.filter((item) => item !== widget)
        : [...current.hidden, widget];
      return { ...current, hidden };
    });
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
    pushToast({ title: "Dashboard restaurado", variant: "success" });
  }

  const visibleWidgets = layout.order[activeTab].filter((widget) => !layout.hidden.includes(widget));
  const hiddenWidgets = layout.order[activeTab].filter((widget) => layout.hidden.includes(widget));

  function renderWidget(widget: WidgetKey, index: number) {
    if (!data || !metrics) return null;

    const commonProps = {
      onMoveUp: () => moveWidget(activeTab, widget, -1),
      onMoveDown: () => moveWidget(activeTab, widget, 1),
      onToggle: () => toggleWidget(widget),
      canMoveUp: index > 0,
      canMoveDown: index < visibleWidgets.length - 1,
    };

    if (widget === "overview") {
      return (
        <WidgetCard key={widget} title="Snapshot" description="Lo importante al abrir la app" {...commonProps}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard stat={{ label: "Peso actual", value: formatNumber(data.profile.latestWeightKg, " kg"), detail: data.profile.phaseLabel, tone: "default" }} />
            <StatCard stat={{ label: "Adherencia media", value: formatNumber(metrics.avgAdherence, "%"), detail: "ultimos check-ins", tone: metrics.avgAdherence != null && metrics.avgAdherence >= 80 ? "success" : "warning" }} />
            <StatCard stat={{ label: "Sueno 7d", value: formatNumber(metrics.avgSleep7d, " h"), detail: "promedio diario", tone: metrics.avgSleep7d != null && metrics.avgSleep7d >= 7 ? "success" : "warning" }} />
            <StatCard stat={{ label: "Sesiones 7d", value: String(metrics.sessions7d.length), detail: `${sum(metrics.sessions7d.map((item) => item.durationMin))} min`, tone: metrics.sessions7d.length >= 3 ? "success" : "default" }} />
          </div>
        </WidgetCard>
      );
    }

    if (widget === "quick-actions") {
      return (
        <WidgetCard key={widget} title="Acciones rapidas" description="Entradas frecuentes del atleta" {...commonProps}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link href="/athlete/training-log" className="rounded-3xl border border-line bg-surface-strong px-4 py-4 text-sm font-medium transition hover:border-accent/35">Registrar entrenamiento</Link>
            <Link href="/athlete/check-in" className="rounded-3xl border border-line bg-surface-strong px-4 py-4 text-sm font-medium transition hover:border-accent/35">Enviar check-in</Link>
            <Link href="/athlete/nutrition/log" className="rounded-3xl border border-line bg-surface-strong px-4 py-4 text-sm font-medium transition hover:border-accent/35">Registrar comida</Link>
            <Link href="/athlete/progress" className="rounded-3xl border border-line bg-surface-strong px-4 py-4 text-sm font-medium transition hover:border-accent/35">Subir progreso</Link>
          </div>
        </WidgetCard>
      );
    }

    if (widget === "recent-checkin") {
      const item = metrics.latestCheckIn;
      return (
        <WidgetCard key={widget} title="Ultimo check-in" description="Estado reportado mas reciente" {...commonProps}>
          {item ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Fecha</p><p className="mt-2 text-xl font-semibold">{formatShortDate(item.date)}</p></div>
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Adherencia</p><p className="mt-2 text-xl font-semibold">{item.adherencePct}%</p></div>
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Sueno</p><p className="mt-2 text-xl font-semibold">{item.sleepHours} h</p></div>
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Pasos</p><p className="mt-2 text-xl font-semibold">{item.stepsAvg}</p></div>
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface-strong p-4 text-sm text-foreground/55">Todavia no hay check-ins registrados.</div>
          )}
        </WidgetCard>
      );
    }

    if (widget === "training-volume") {
      return (
        <WidgetCard key={widget} title="Carga semanal" description="Volumen reciente segun tus registros" {...commonProps}>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <MiniBars
              values={metrics.durationSeries.length > 0 ? metrics.durationSeries.map((item) => item.value) : [0, 0, 0, 0, 0, 0, 0]}
              labels={metrics.durationSeries.length > 0 ? metrics.durationSeries.map((item) => item.label) : ["-", "-", "-", "-", "-", "-", "-"]}
              suffix="m"
              tone="accent"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Sesiones 7d</p><p className="mt-2 text-3xl font-bold">{metrics.sessions7d.length}</p></div>
              <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Minutos 7d</p><p className="mt-2 text-3xl font-bold">{sum(metrics.sessions7d.map((item) => item.durationMin))}</p></div>
            </div>
          </div>
        </WidgetCard>
      );
    }

    if (widget === "recent-sessions") {
      return (
        <WidgetCard key={widget} title="Ultimas sesiones" description="Historial inmediato para revisar consistencia" {...commonProps}>
          <div className="space-y-3">
            {data.sessionLogs.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-3xl border border-line bg-surface-strong px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{item.sessionName}</p>
                  <p className="text-xs text-foreground/50">{formatShortDate(item.date)}</p>
                </div>
                <p className="text-sm font-medium text-foreground/70">{item.durationMin ?? 0} min</p>
              </div>
            ))}
            {data.sessionLogs.length === 0 ? <div className="rounded-3xl border border-line bg-surface-strong p-4 text-sm text-foreground/55">Aun no hay sesiones registradas.</div> : null}
          </div>
        </WidgetCard>
      );
    }

    if (widget === "sleep-trend") {
      return (
        <WidgetCard key={widget} title="Sueno 7 dias" description="Horas de descanso registradas" {...commonProps}>
          {metrics.sleepSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metrics.sleepSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} h`, "Sueno"]} />
                <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#sleepGrad)" dot={{ r: 3, fill: "#34d399" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <MiniBars
              values={metrics.sleepSeries.length > 0 ? metrics.sleepSeries.map((item) => item.value) : [0, 0, 0, 0, 0, 0, 0]}
              labels={metrics.sleepSeries.length > 0 ? metrics.sleepSeries.map((item) => item.label) : ["-", "-", "-", "-", "-", "-", "-"]}
              suffix="h"
              tone="success"
            />
          )}
        </WidgetCard>
      );
    }

    if (widget === "steps-trend") {
      return (
        <WidgetCard key={widget} title="Pasos 7 dias" description="Actividad diaria reciente" {...commonProps}>
          <MiniBars
            values={metrics.stepsSeries.length > 0 ? metrics.stepsSeries.map((item) => item.value) : [0, 0, 0, 0, 0, 0, 0]}
            labels={metrics.stepsSeries.length > 0 ? metrics.stepsSeries.map((item) => item.label) : ["-", "-", "-", "-", "-", "-", "-"]}
            tone="warning"
          />
        </WidgetCard>
      );
    }

    if (widget === "nutrition-today") {
      const cards = [
        { label: "Kcal", current: metrics.todayNutrition.kcal, target: metrics.nutritionTarget.kcalTarget, suffix: "" },
        { label: "Proteína", current: metrics.todayNutrition.protein, target: metrics.nutritionTarget.proteinG, suffix: " g" },
        { label: "Carbs", current: metrics.todayNutrition.carbs, target: metrics.nutritionTarget.carbsG, suffix: " g" },
        { label: "Grasas", current: metrics.todayNutrition.fat, target: metrics.nutritionTarget.fatG, suffix: " g" },
      ];
      return (
        <WidgetCard key={widget} title="Nutricion de hoy" description="Objetivo vs consumo actual dentro de la app" {...commonProps}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Comidas</p><p className="mt-2 text-2xl font-bold">{metrics.todayNutrition.meals}</p><p className="mt-1 text-xs text-foreground/45">{metrics.nutritionTarget.mode === "FIXED" ? "dieta fija" : "macros flexibles"}</p></div>
            {cards.map((card) => {
              const pct = card.target > 0 ? Math.min(100, Math.round((card.current / card.target) * 100)) : 0;
              return (
                <div key={card.label} className="rounded-3xl border border-line bg-surface-strong p-4">
                  <p className="text-xs text-foreground/45">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold">{card.current}{card.suffix}</p>
                  <p className="mt-1 text-xs text-foreground/45">Objetivo {card.target}{card.suffix}</p>
                  <div className="mt-3 h-2 rounded-full bg-background/70">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </WidgetCard>
      );
    }

    if (widget === "nutrition-week") {
      return (
        <WidgetCard key={widget} title="Promedio nutricional" description="Media reciente y compliance frente al objetivo" {...commonProps}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard stat={{ label: "Kcal / día", value: String(Math.round(metrics.weeklyNutrition.kcal ?? 0)), detail: metrics.weeklyNutrition.complianceKcal != null ? `${metrics.weeklyNutrition.complianceKcal}% del objetivo` : "sin objetivo", tone: "default" }} />
            <StatCard stat={{ label: "Proteína / día", value: `${Math.round(metrics.weeklyNutrition.protein ?? 0)} g`, detail: metrics.weeklyNutrition.complianceProtein != null ? `${metrics.weeklyNutrition.complianceProtein}% del objetivo` : "sin objetivo", tone: "success" }} />
            <StatCard stat={{ label: "Carbs / día", value: `${Math.round(metrics.weeklyNutrition.carbs ?? 0)} g`, detail: metrics.weeklyNutrition.complianceCarbs != null ? `${metrics.weeklyNutrition.complianceCarbs}% del objetivo` : "sin objetivo", tone: "default" }} />
            <StatCard stat={{ label: "Grasas / día", value: `${Math.round(metrics.weeklyNutrition.fat ?? 0)} g`, detail: metrics.weeklyNutrition.complianceFat != null ? `${metrics.weeklyNutrition.complianceFat}% del objetivo` : "sin objetivo", tone: "warning" }} />
          </div>
        </WidgetCard>
      );
    }

    if (widget === "body-metrics") {
      return (
        <WidgetCard key={widget} title="Composicion corporal" description="Ultimos datos del diario o medicion" {...commonProps}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Peso</p><p className="mt-2 text-3xl font-bold">{formatNumber(data.profile.latestWeightKg, " kg")}</p></div>
            <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">Cintura</p><p className="mt-2 text-3xl font-bold">{formatNumber(metrics.latestDaily?.waistCm ?? null, " cm")}</p></div>
            <div className="rounded-3xl border border-line bg-surface-strong p-4"><p className="text-xs text-foreground/45">% graso</p><p className="mt-2 text-3xl font-bold">{formatNumber(metrics.latestDaily?.bodyFatPct ?? null, "%")}</p></div>
          </div>
        </WidgetCard>
      );
    }

    if (widget === "weight-trend") {
      return (
        <WidgetCard key={widget} title="Peso reciente" description="Tendencia de peso de los ultimos 7 registros" {...commonProps}>
          {metrics.weightSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metrics.weightSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} kg`, "Peso"]} />
                <Area type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} fill="url(#weightGrad)" dot={{ r: 3, fill: "var(--color-accent)" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <MiniBars
              values={metrics.weightSeries.length > 0 ? metrics.weightSeries.map((item) => item.value) : [0, 0, 0, 0, 0, 0, 0]}
              labels={metrics.weightSeries.length > 0 ? metrics.weightSeries.map((item) => item.label) : ["-", "-", "-", "-", "-", "-", "-"]}
              suffix="kg"
              tone="accent"
            />
          )}
        </WidgetCard>
      );
    }

    if (widget === "adherence-trend") {
      return (
        <WidgetCard key={widget} title="Tendencia de adherencia" description="Adherencia y calidad de sueno por semana de check-in" {...commonProps}>
          {metrics.adherenceSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={metrics.adherenceSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 12]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Line yAxisId="left" type="monotone" dataKey="adherencia" name="Adherencia %" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="sueno" name="Sueno (h)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-4 text-sm text-foreground/50">Necesitas al menos 2 check-ins para ver la tendencia.</p>
          )}
        </WidgetCard>
      );
    }

    if (widget === "macro-trend") {
      return (
        <WidgetCard key={widget} title="Tendencia de macros" description="Evolucion diaria de kcal y macronutrientes registrados" {...commonProps}>
          {metrics.macroSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.macroSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="kcalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Area type="monotone" dataKey="kcal" name="Kcal" stroke="#f59e0b" strokeWidth={2} fill="url(#kcalGrad)" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="proteina" name="Proteina g" stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="carbs" name="Carbs g" stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="grasa" name="Grasa g" stroke="#fb7185" strokeWidth={2} dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-4 text-sm text-foreground/50">Registra comidas durante varios dias para ver la tendencia.</p>
          )}
        </WidgetCard>
      );
    }

    if (widget === "correlation-sleep-training") {
      return (
        <WidgetCard key={widget} title="Sueno vs entrenamiento" description="Correlacion entre horas de descanso y volumen de entrenamiento" {...commonProps}>
          {metrics.sleepSessionCorrelation.filter((item) => item.sueno > 0 || item.entrenamiento > 0).length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={metrics.sleepSessionCorrelation} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="sleep" domain={[0, 12]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="training" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Line yAxisId="sleep" type="monotone" dataKey="sueno" name="Sueno (h)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="training" type="monotone" dataKey="entrenamiento" name="Entreno (min)" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-4 text-sm text-foreground/50">Necesitas datos de sueño y sesiones para ver la correlacion.</p>
          )}
        </WidgetCard>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
        <Skeleton className="h-44 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)}
        </div>
        <Skeleton className="h-[420px] w-full" />
      </main>
    );
  }

  if (!data || !metrics) {
    return (
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10">
        <SectionIntro
          eyebrow="Dashboard atleta"
          title="No se pudo cargar tu panel"
          description="Necesitas completar tu perfil o volver a intentarlo para ver las metricas iniciales."
        />
      </main>
    );
  }

  const currentTabMeta = TAB_META.find((tab) => tab.key === activeTab) ?? TAB_META[0];

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Dashboard atleta"
        title={`Centro de control · ${data.profile.fullName}`}
        description="Vista modular para revisar entrenamiento, recuperacion, nutricion y progreso sin saltar entre pantallas."
        aside={`${data.profile.phaseLabel} · ${data.profile.goal}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard stat={{ label: "Peso actual", value: formatNumber(data.profile.latestWeightKg, " kg"), detail: data.profile.phaseLabel, tone: "default" }} />
        <StatCard stat={{ label: "Adherencia media", value: formatNumber(metrics.avgAdherence, "%"), detail: "ultimos check-ins", tone: metrics.avgAdherence != null && metrics.avgAdherence >= 80 ? "success" : "warning" }} />
        <StatCard stat={{ label: "Sueno 7d", value: formatNumber(metrics.avgSleep7d, " h"), detail: "promedio diario", tone: metrics.avgSleep7d != null && metrics.avgSleep7d >= 7 ? "success" : "warning" }} />
        <StatCard stat={{ label: "Sesiones 7d", value: String(metrics.sessions7d.length), detail: `${sum(metrics.sessions7d.map((item) => item.durationMin))} min`, tone: metrics.sessions7d.length >= 3 ? "success" : "default" }} />
      </section>

      <section className="rounded-4xl border border-line bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {TAB_META.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-accent/40 bg-accent/12 text-accent" : "border-line bg-surface-strong text-foreground/65 hover:border-accent/30"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent/8 px-3 py-1 text-sm text-foreground/60">{currentTabMeta.description}</span>
            <button
              type="button"
              onClick={resetLayout}
              className="rounded-full border border-line bg-surface-strong px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-accent/35"
            >
              Restaurar layout
            </button>
          </div>
        </div>
      </section>

      {hiddenWidgets.length > 0 ? (
        <section className="rounded-4xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground/65">Widgets ocultos:</p>
            {hiddenWidgets.map((widget) => (
              <button
                key={widget}
                type="button"
                onClick={() => toggleWidget(widget)}
                className="rounded-full border border-line bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-accent/35"
              >
                Mostrar {WIDGET_LABELS[widget]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5">
        {visibleWidgets.map((widget, index) => renderWidget(widget, index))}
      </section>
    </main>
  );
}