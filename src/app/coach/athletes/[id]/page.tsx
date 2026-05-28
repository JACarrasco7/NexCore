'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { SplitLayout } from '@/components/layout/split-layout'
import { TabsBar } from '@/components/layout/tabs-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { AthleteContextPanel } from '@/components/coach/athlete-context-panel'
import { DocumentPanel } from '@/components/document-panel'
import { AthletePhotosTab } from '@/components/athlete-photos-tab'
import { NutritionComplianceTab } from '@/components/nutrition-compliance-tab'

// ─── Types ────────────────────────────────────────────────────────────────────

type OverviewPlan = {
  id: string
  title: string
  weeksCount: number
  sessionsCount: number
  createdAt: string
}
type OverviewMealFood = {
  id: string
  food: string
  quantity: number
  unit: string
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}
type OverviewMeal = {
  id: string
  name: string
  time: string
  order: number
  foods: OverviewMealFood[]
}
type OverviewNutritionPlan = {
  id: string
  title: string
  isActive: boolean
  kcalTarget: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  meals: OverviewMeal[]
}
type OverviewCheckIn = {
  id: string
  date: string
  weekLabel: string | null
  weightKg: number
  adherencePct: number
  sleepHours: number
  stepsAvg: number
  sensations?: string | null
  coachNote?: string | null
}
type OverviewSession = {
  id: string
  sessionName: string
  date: string
  durationMin: number | null
  kcalBurned: number | null
  heartRateAvg?: number | null
  source?: string
}
type OverviewDoc = {
  id: string
  title: string
  category: string
  fileName: string
  createdAt: string
}
type TrendPoint = { date: string; value: number }
type BodyMeasurement = {
  id: string
  date: string
  weightKg: number | null
  bodyFatPct: number | null
  waistCm: number | null
  hipCm: number | null
  chestCm: number | null
  armCm: number | null
  quadCm: number | null
  calfCm: number | null
  glutesCm: number | null
  neckCm: number | null
  notes: string | null
}
type Overview = {
  id: string
  fullName: string
  goal: string
  phaseLabel: string
  weightTrend: { date: string; weightKg: number | null }[]
  sleepTrend: TrendPoint[]
  stepsTrend: TrendPoint[]
  bodyMeasurements: BodyMeasurement[]
  plans: OverviewPlan[]
  nutritionPlans: OverviewNutritionPlan[]
  checkIns: OverviewCheckIn[]
  recentSessions: OverviewSession[]
  documents: OverviewDoc[]
  stats: {
    totalCheckIns: number
    totalSessions: number
    avgAdherence: number | null
    lastCheckInDate: string | null
    nextCheckInDueAt: string | null
    streakWeeks: number
    restrictionsCount: number
    latestWeightKg: number | null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GOAL_TONE: Record<string, string> = {
  volumen: 'text-success',
  definicion: 'text-warning',
  mantenimiento: 'text-foreground/50',
  'peak-week': 'text-danger',
}

const GOAL_LABEL: Record<string, string> = {
  volumen: 'Volumen',
  definicion: 'Definición',
  mantenimiento: 'Mantenimiento',
  'peak-week': 'Peak Week',
}

function daysDiff(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function AdherenceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="bg-line/30 h-1.5 w-full rounded-full">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-strong rounded-xl px-2.5 py-2 text-center">
      <p className="text-foreground/35 text-[10px] tracking-widest uppercase">{label}</p>
      <p className="text-base leading-tight font-bold">{value}</p>
    </div>
  )
}

function ActionLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-foreground/60 hover:bg-surface-strong hover:text-foreground flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition"
    >
      <span className="text-xs">{icon}</span> {label}
    </Link>
  )
}

function NutriBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-strong rounded px-2 py-1">
      <span className="text-foreground/45">{label} </span>
      <strong>{value}</strong>
    </div>
  )
}

function StatBig({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-line bg-surface rounded-2xl border p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-foreground/50 mt-0.5 text-xs">{label}</p>
      {sub && <p className="text-foreground/30 mt-0.5 text-[10px]">{sub}</p>}
    </div>
  )
}

function EmptyCard({ text, tall }: { text: string; tall?: boolean }) {
  return (
    <div
      className={`border-line bg-surface text-foreground/40 flex items-center justify-center rounded-2xl border border-dashed text-sm ${tall ? 'py-16' : 'p-8'}`}
    >
      {text}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'estadisticas', label: 'Estadísticas' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'entrenamiento', label: 'Entrenamiento' },
  { key: 'contexto', label: 'Contexto' },
  { key: 'nutricion', label: 'Nutrición' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'salud', label: 'Salud' },
  { key: 'contrato', label: 'Contrato' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Aside dinámico ───────────────────────────────────────────────────────────

function AsideContent({
  tab,
  overview,
  athleteId,
}: {
  tab: TabKey
  overview: Overview
  athleteId: string
}) {
  const { stats, plans, nutritionPlans, checkIns } = overview
  const activePlan = plans[0] ?? null
  const activeNutrition = nutritionPlans.find((n) => n.isActive) ?? nutritionPlans[0] ?? null
  const lastCI = checkIns[0] ?? null
  const daysNoCI = daysDiff(stats.lastCheckInDate)

  const identityCard = (
    <div className="border-line bg-surface rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
          {overview.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate leading-tight font-semibold">{overview.fullName}</p>
          <p className={`text-xs font-medium ${GOAL_TONE[overview.goal] ?? 'text-foreground/50'}`}>
            {GOAL_LABEL[overview.goal] ?? overview.goal} · {overview.phaseLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <KpiChip label="Adherencia" value={`${stats.avgAdherence ?? '—'}%`} />
        <KpiChip
          label="Peso"
          value={stats.latestWeightKg != null ? `${stats.latestWeightKg} kg` : '—'}
        />
        <KpiChip label="Racha" value={`${stats.streakWeeks} sem`} />
        <KpiChip label="Check-ins" value={String(stats.totalCheckIns)} />
      </div>
    </div>
  )

  const quickActions = (
    <div className="border-line bg-surface space-y-1 rounded-2xl border p-3 shadow-sm">
      <p className="text-foreground/35 px-1 pb-1 text-[10px] tracking-widest uppercase">Acciones</p>
      <ActionLink href={`/coach/messages?athlete=${athleteId}`} icon="💬" label="Enviar mensaje" />
      <ActionLink
        href={`/coach/athletes/${athleteId}/context/print`}
        icon="🖨️"
        label="Imprimir contexto"
      />
      <ActionLink
        href={`/coach/nutrition?athlete=${athleteId}`}
        icon="🥗"
        label="Plan nutricional"
      />
    </div>
  )

  if (tab === 'resumen') {
    return (
      <>
        {identityCard}
        {daysNoCI != null && daysNoCI > 7 && (
          <div className="border-warning/30 bg-warning/8 text-warning rounded-2xl border p-3 text-xs">
            ⚠️ Sin check-in hace <strong>{daysNoCI} días</strong>
          </div>
        )}
        {quickActions}
      </>
    )
  }

  if (tab === 'estadisticas') {
    return (
      <>
        {identityCard}
        <div className="border-line bg-surface rounded-2xl border p-4 shadow-sm">
          <p className="text-foreground/50 mb-2 text-xs font-semibold">Tendencia peso</p>
          <div className="flex h-12 items-end gap-0.5">
            {(() => {
              const pts = overview.weightTrend
                .filter((p) => p.weightKg != null && p.weightKg > 0)
                .slice(-12)
              const max = Math.max(...pts.map((p) => p.weightKg as number), 1)
              return pts.map((p, i) => (
                <div
                  key={i}
                  className="bg-accent/40 min-h-0.5 flex-1 rounded-sm"
                  style={{ height: `${((p.weightKg as number) / max) * 100}%` }}
                  title={`${p.weightKg} kg`}
                />
              ))
            })()}
          </div>
        </div>
      </>
    )
  }

  if (tab === 'checkins') {
    return (
      <>
        {identityCard}
        {lastCI && (
          <div className="border-line bg-surface space-y-2 rounded-2xl border p-4 shadow-sm">
            <p className="text-foreground/45 text-xs font-semibold">Último check-in</p>
            <p className="font-semibold">{lastCI.weekLabel ?? lastCI.date}</p>
            <AdherenceBar pct={lastCI.adherencePct} />
            <p className="text-foreground/50 text-xs">
              {lastCI.adherencePct}% · {lastCI.weightKg} kg
            </p>
          </div>
        )}
        {stats.nextCheckInDueAt && (
          <div className="border-line bg-surface rounded-2xl border px-4 py-3 text-xs shadow-sm">
            Próximo: <strong>{stats.nextCheckInDueAt}</strong>
          </div>
        )}
      </>
    )
  }

  if (tab === 'entrenamiento') {
    return (
      <>
        {identityCard}
        {activePlan ? (
          <div className="border-line bg-surface space-y-2 rounded-2xl border p-4 shadow-sm">
            <p className="text-foreground/35 text-[10px] tracking-widest uppercase">Plan activo</p>
            <p className="font-semibold">{activePlan.title}</p>
            <p className="text-foreground/50 text-xs">
              {activePlan.weeksCount} semanas · {activePlan.sessionsCount} sesiones
            </p>
            <Link
              href={`/coach/plans/${activePlan.id}/print`}
              className="border-line text-foreground/60 hover:text-foreground mt-1 block rounded-xl border py-1.5 text-center text-xs transition"
            >
              Imprimir plan
            </Link>
          </div>
        ) : (
          <p className="border-line text-foreground/40 rounded-2xl border border-dashed p-4 text-center text-xs">
            Sin plan activo
          </p>
        )}
      </>
    )
  }

  if (tab === 'contexto') {
    return (
      <>
        {identityCard}
        <div className="border-line bg-surface rounded-2xl border p-4 shadow-sm">
          <p className="text-foreground/35 text-[10px] tracking-widest uppercase">Restricciones</p>
          <p className="mt-1 text-2xl font-bold">{stats.restrictionsCount}</p>
          <p className="text-foreground/45 text-xs">alimentos + ejercicios</p>
        </div>
      </>
    )
  }

  if (tab === 'nutricion') {
    return (
      <>
        {identityCard}
        {activeNutrition ? (
          <div className="border-line bg-surface space-y-2 rounded-2xl border p-4 shadow-sm">
            <p className="text-foreground/35 text-[10px] tracking-widest uppercase">Plan activo</p>
            <p className="font-semibold">{activeNutrition.title}</p>
            {activeNutrition.kcalTarget && (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <NutriBadge label="Kcal" value={String(activeNutrition.kcalTarget)} />
                <NutriBadge label="P" value={`${activeNutrition.proteinG ?? '—'}g`} />
                <NutriBadge label="C" value={`${activeNutrition.carbsG ?? '—'}g`} />
                <NutriBadge label="G" value={`${activeNutrition.fatG ?? '—'}g`} />
              </div>
            )}
          </div>
        ) : (
          <p className="border-line text-foreground/40 rounded-2xl border border-dashed p-4 text-center text-xs">
            Sin plan nutricional
          </p>
        )}
        <Link
          href={`/coach/nutrition?athlete=${athleteId}`}
          className="bg-accent hover:bg-accent-strong block rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white transition"
        >
          Editar plan
        </Link>
      </>
    )
  }

  if (tab === 'documentos') {
    const cats = [...new Set(overview.documents.map((d) => d.category))]
    return (
      <>
        {identityCard}
        <div className="border-line bg-surface space-y-2 rounded-2xl border p-4 shadow-sm">
          <p className="text-foreground/35 text-[10px] tracking-widest uppercase">Documentos</p>
          <p className="mt-1 text-2xl font-bold">{overview.documents.length}</p>
          {cats.map((c) => (
            <div key={c} className="flex items-center justify-between text-xs">
              <span className="text-foreground/60 capitalize">{c}</span>
              <span className="text-foreground/40">
                {overview.documents.filter((d) => d.category === c).length}
              </span>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {identityCard}
      {quickActions}
    </>
  )
}

// ─── Volume references (Israetel/Schoenfeld MEV/MAV/MRV) ──────────────────────
const VOLUME_REFS: Record<string, { mev: number; mav: number; mrv: number }> = {
  Pectoral: { mev: 8, mav: 16, mrv: 22 },
  Espalda: { mev: 10, mav: 18, mrv: 25 },
  Trapecio: { mev: 4, mav: 12, mrv: 20 },
  Deltoides: { mev: 8, mav: 14, mrv: 20 },
  Bíceps: { mev: 6, mav: 12, mrv: 20 },
  Tríceps: { mev: 6, mav: 12, mrv: 18 },
  Cuádriceps: { mev: 8, mav: 14, mrv: 20 },
  Isquiotibiales: { mev: 6, mav: 12, mrv: 20 },
  Glúteos: { mev: 4, mav: 12, mrv: 20 },
  Gemelos: { mev: 8, mav: 16, mrv: 26 },
  Core: { mev: 4, mav: 10, mrv: 16 },
  Otros: { mev: 4, mav: 10, mrv: 16 },
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

// ── Shared chart helpers ─────────────────────────────────────────────────────
const CHART_GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.06)' } as const
const AXIS_STYLE = { fontSize: 11, fill: 'rgba(255,255,255,0.4)' } as const
const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: 12,
    fontSize: 12,
  },
} as const

function ChartCard({
  title,
  children,
  footnote,
}: {
  title: string
  children: React.ReactNode
  footnote?: string
}) {
  return (
    <div className="border-line bg-surface rounded-2xl border p-5">
      <h3 className="text-foreground/70 mb-4 font-semibold">{title}</h3>
      {children}
      {footnote && <p className="text-foreground/40 mt-2 text-xs">{footnote}</p>}
    </div>
  )
}

function BodyCompositionTrendChart({ measurements }: { measurements: BodyMeasurement[] }) {
  const data = measurements
    .filter((m) => m.weightKg != null && m.weightKg > 0)
    .map((m) => {
      const weight = m.weightKg as number
      const bf = m.bodyFatPct
      const fatMass = bf != null ? +((weight * bf) / 100).toFixed(1) : null
      const leanMass = bf != null ? +(weight * (1 - bf / 100)).toFixed(1) : null
      return {
        label: new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        weight,
        fatMass,
        leanMass,
      }
    })

  if (data.length < 2) return null

  return (
    <ChartCard title="Composición corporal (peso, masa magra y grasa)">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="kg" />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          <Line
            type="monotone"
            dataKey="weight"
            name="Peso"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="leanMass"
            name="Masa magra"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="fatMass"
            name="Masa grasa"
            stroke="#fb923c"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function estimateNeatFromSteps(steps: number, weightKg: number) {
  return Math.round(steps * 0.04 * (weightKg / 80))
}

function AdvancedMetricsPanel({ overview }: { overview: Overview }) {
  const lastMeasure = overview.bodyMeasurements[overview.bodyMeasurements.length - 1] ?? null
  const lastWeight =
    overview.weightTrend
      .slice()
      .reverse()
      .find((w) => w.weightKg != null)?.weightKg ?? null
  const avgSteps7 =
    overview.stepsTrend.length >= 7
      ? Math.round(overview.stepsTrend.slice(-7).reduce((s, d) => s + d.value, 0) / 7)
      : overview.stepsTrend.length > 0
        ? Math.round(
            overview.stepsTrend.reduce((s, d) => s + d.value, 0) / overview.stepsTrend.length
          )
        : null

  const neat =
    avgSteps7 != null && lastWeight != null ? estimateNeatFromSteps(avgSteps7, lastWeight) : null
  const bf = lastMeasure?.bodyFatPct ?? null
  const heightM = 1.74
  const ffmi =
    lastWeight != null && bf != null
      ? +((lastWeight * (1 - bf / 100)) / (heightM * heightM)).toFixed(1)
      : null

  const waistTrend = overview.bodyMeasurements
    .filter((m) => m.waistCm != null)
    .slice(-8)
    .map((m) => ({
      label: new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      value: m.waistCm as number,
    }))

  return (
    <ChartCard title="Métricas avanzadas" footnote="NEAT, FFMI y control de composición">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-line bg-surface-strong rounded-xl border p-3">
          <p className="text-foreground/40 text-[10px] tracking-widest uppercase">NEAT estimado</p>
          <p className="text-foreground mt-1 text-xl font-bold">
            {neat != null ? `${neat.toLocaleString('es-ES')} kcal` : '—'}
          </p>
          <p className="text-foreground/40 text-xs">
            {avgSteps7 != null
              ? `${avgSteps7.toLocaleString('es-ES')} pasos/día (7d)`
              : 'Sin pasos'}
          </p>
        </div>
        <div className="border-line bg-surface-strong rounded-xl border p-3">
          <p className="text-foreground/40 text-[10px] tracking-widest uppercase">FFMI (est.)</p>
          <p className="text-foreground mt-1 text-xl font-bold">{ffmi ?? '—'}</p>
          <p className="text-foreground/40 text-xs">Altura ref 1.74m</p>
        </div>
        <div className="border-line bg-surface-strong rounded-xl border p-3">
          <p className="text-foreground/40 text-[10px] tracking-widest uppercase">% grasa</p>
          <p className="text-foreground mt-1 text-xl font-bold">{bf != null ? `${bf}%` : '—'}</p>
          <p className="text-foreground/40 text-xs">Última medición</p>
        </div>
        <div className="border-line bg-surface-strong rounded-xl border p-3">
          <p className="text-foreground/40 text-[10px] tracking-widest uppercase">Cintura</p>
          <p className="text-foreground mt-1 text-xl font-bold">
            {lastMeasure?.waistCm != null ? `${lastMeasure.waistCm} cm` : '—'}
          </p>
          <p className="text-foreground/40 text-xs">Proxy grasa visceral</p>
        </div>
      </div>

      {waistTrend.length > 1 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={waistTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waistGradAdv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="cm" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} cm`, 'Cintura']} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#fb7185"
                strokeWidth={2}
                fill="url(#waistGradAdv)"
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

function CoachSignalsPanel({ overview }: { overview: Overview }) {
  const signals: Array<{ level: 'ok' | 'warn' | 'alert'; msg: string }> = []

  const lastCheckIn = overview.checkIns[0] ?? null
  if (lastCheckIn) {
    if (lastCheckIn.adherencePct < 60)
      signals.push({ level: 'alert', msg: `Adherencia crítica (${lastCheckIn.adherencePct}%)` })
    else if (lastCheckIn.adherencePct < 85)
      signals.push({ level: 'warn', msg: `Adherencia mejorable (${lastCheckIn.adherencePct}%)` })
    else signals.push({ level: 'ok', msg: `Adherencia sólida (${lastCheckIn.adherencePct}%)` })
  }

  const sleep7 = overview.sleepTrend.slice(-7)
  if (sleep7.length >= 3) {
    const avgSleep = +(sleep7.reduce((s, d) => s + d.value, 0) / sleep7.length).toFixed(1)
    if (avgSleep < 6) signals.push({ level: 'alert', msg: `Sueño bajo (${avgSleep}h)` })
    else if (avgSleep < 7) signals.push({ level: 'warn', msg: `Sueño mejorable (${avgSleep}h)` })
    else signals.push({ level: 'ok', msg: `Sueño en rango (${avgSleep}h)` })
  }

  const steps7 = overview.stepsTrend.slice(-7)
  if (steps7.length >= 3) {
    const avgSteps = Math.round(steps7.reduce((s, d) => s + d.value, 0) / steps7.length)
    if (avgSteps < 7000)
      signals.push({
        level: 'alert',
        msg: `Actividad baja (${avgSteps.toLocaleString('es-ES')} pasos)`,
      })
    else if (avgSteps < 10000)
      signals.push({
        level: 'warn',
        msg: `Actividad media (${avgSteps.toLocaleString('es-ES')} pasos)`,
      })
    else
      signals.push({
        level: 'ok',
        msg: `Actividad buena (${avgSteps.toLocaleString('es-ES')} pasos)`,
      })
  }

  if (signals.length === 0) return null

  const cls = (level: 'ok' | 'warn' | 'alert') => {
    if (level === 'ok') return 'border-success/25 bg-success/8 text-success'
    if (level === 'warn') return 'border-warning/25 bg-warning/8 text-warning'
    return 'border-danger/25 bg-danger/8 text-danger'
  }

  return (
    <ChartCard
      title="Señales del coach"
      footnote="Alertas automáticas por adherencia, sueño y pasos"
    >
      <div className="space-y-2">
        {signals.map((s, i) => (
          <div
            key={`${s.level}-${i}`}
            className={`rounded-xl border px-3 py-2 text-sm ${cls(s.level)}`}
          >
            {s.msg}
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

function CheckInTrendChart({ checkIns }: { checkIns: OverviewCheckIn[] }) {
  if (checkIns.length < 3) return null

  const data = [...checkIns].reverse().map((c) => ({
    label: new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    adherencia: c.adherencePct,
    sueno: c.sleepHours,
    peso: c.weightKg,
  }))

  return (
    <ChartCard title="Tendencia de check-ins" footnote="Adherencia, sueño y peso por semana">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="pct"
            domain={[0, 100]}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis
            yAxisId="kg"
            orientation="right"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            unit="kg"
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="adherencia"
            name="Adherencia %"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="sueno"
            name="Sueño (h)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 2 }}
          />
          <Line
            yAxisId="kg"
            type="monotone"
            dataKey="peso"
            name="Peso (kg)"
            stroke="#a78bfa"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TrainingFrequencyChart({ sessions }: { sessions: OverviewSession[] }) {
  const weekMap = new Map<string, number>()
  for (const s of sessions) {
    const d = new Date(s.date)
    const dow = d.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    const wk = mon.toISOString().split('T')[0]
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1)
  }

  const data = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      label: date.slice(5),
      count,
      color: count >= 5 ? '#34d399' : count >= 3 ? '#22d3ee' : count >= 1 ? '#f59e0b' : '#475569',
    }))

  if (data.length === 0) return null
  const avg = +(data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1)

  return (
    <ChartCard title="Frecuencia de entrenamiento" footnote={`Media ${avg} sesiones/semana`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} sesiones`, 'Frecuencia']} />
          <ReferenceLine y={avg} stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function SessionLoadChart({ sessions }: { sessions: OverviewSession[] }) {
  const data = [...sessions]
    .reverse()
    .filter((s) => s.durationMin != null || s.kcalBurned != null)
    .map((s) => ({
      label: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      duration: s.durationMin ?? null,
      kcal: s.kcalBurned ?? null,
      name: s.sessionName,
    }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Duración y kcal por sesión" footnote="Carga interna por sesión registrada">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis yAxisId="dur" tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="m" />
          <YAxis
            yAxisId="kcal"
            orientation="right"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            unit="k"
          />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          <Bar
            yAxisId="dur"
            dataKey="duration"
            name="Duración (min)"
            fill="rgba(56,189,248,0.45)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="kcal"
            type="monotone"
            dataKey="kcal"
            name="Kcal"
            stroke="#fb923c"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function HeartRateChart({ sessions }: { sessions: OverviewSession[] }) {
  const data = [...sessions]
    .reverse()
    .filter((s) => s.heartRateAvg != null)
    .map((s) => ({
      label: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      hr: s.heartRateAvg as number,
      name: s.sessionName,
    }))

  if (data.length < 2) return null
  const avgHr = Math.round(data.reduce((s, d) => s + d.hr, 0) / data.length)

  const hrColor = (hr: number) => {
    if (hr < 130) return '#38bdf8'
    if (hr < 155) return '#34d399'
    if (hr < 170) return '#f59e0b'
    return '#f87171'
  }

  return (
    <ChartCard title="FC media por sesión" footnote={`Media ${avgHr} bpm`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="bpm" />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} bpm`, 'FC']} />
          <ReferenceLine y={avgHr} stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
          <Bar dataKey="hr" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={hrColor(entry.hr)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

type TrainingStatsSet = {
  exercise: string
  setNumber: number
  loadKg: number
  reps: number
  rir?: number
}

type TrainingStatsSession = {
  id: string
  date: string
  sessionName: string
  durationMin?: number | null
  kcalBurned?: number | null
  heartRateAvg?: number | null
  sets: TrainingStatsSet[]
}

function inferSpecificMuscle(exerciseName: string): string | null {
  const e = exerciseName.toLowerCase()
  if (/sentadilla|squat|prensa|extension/.test(e)) return 'Cuádriceps'
  if (/femoral|isquio|rumano|rdl|nordic/.test(e)) return 'Isquios'
  if (/hip thrust|glute|abduccion|kickback/.test(e)) return 'Glúteos'
  if (/banca|bench|aperturas|pecho|fondos/.test(e)) return 'Pectoral'
  if (/remo|jalon|dominada|pulldown|espalda/.test(e)) return 'Espalda'
  if (/militar|hombro|elevacion|face pull|deltoid/.test(e)) return 'Deltoides'
  if (/biceps|curl|martillo|hammer/.test(e)) return 'Bíceps'
  if (/triceps|frances|pushdown|extension cuerda/.test(e)) return 'Tríceps'
  if (/trapecio|shrug|encogimiento/.test(e)) return 'Trapecio'
  if (/gemelo|pantorrilla|calf|soleo/.test(e)) return 'Gemelos'
  if (/plancha|crunch|ab wheel|core|oblicuo/.test(e)) return 'Core'
  return null
}

function RIRComplianceChart({ trainingSessions }: { trainingSessions: TrainingStatsSession[] }) {
  const data = trainingSessions
    .filter((s) => s.sets.length > 0)
    .map((s) => {
      const rirs = s.sets.map((st) => st.rir ?? 0).filter((r) => r >= 0)
      const avgRir = rirs.length
        ? +(rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1)
        : null
      return {
        label: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        avgRir,
        session: s.sessionName,
        totalSets: s.sets.length,
      }
    })
    .filter(
      (d): d is { label: string; avgRir: number; session: string; totalSets: number } =>
        d.avgRir != null
    )

  if (data.length === 0) return null

  const overallAvg = +(data.reduce((s, d) => s + d.avgRir, 0) / data.length).toFixed(1)
  const rirColor = (rir: number) =>
    rir <= 1 ? '#22c55e' : rir <= 2 ? '#14b8a6' : rir <= 3 ? '#f59e0b' : '#ef4444'

  return (
    <ChartCard title="RIR ejecutado por sesión" footnote={`Media global RIR ${overallAvg}`}>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 6]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`RIR ${v}`, 'RIR medio']} />
          <ReferenceLine y={2} stroke="rgba(20,184,166,0.45)" strokeDasharray="4 4" />
          <Bar dataKey="avgRir" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={rirColor(entry.avgRir)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function MesocycleVolumeChart({ trainingSessions }: { trainingSessions: TrainingStatsSession[] }) {
  const weekMap = new Map<string, { sets: number; sessions: number }>()
  for (const s of trainingSessions) {
    const d = new Date(s.date)
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
    const wk = mon.toISOString().split('T')[0]
    const entry = weekMap.get(wk) ?? { sets: 0, sessions: 0 }
    entry.sets += s.sets.length
    entry.sessions += 1
    weekMap.set(wk, entry)
  }

  const data = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e]) => ({ label: date.slice(5), sets: e.sets, sessions: e.sessions }))

  if (data.length < 2) return null
  const avgSets = Math.round(data.reduce((s, d) => s + d.sets, 0) / data.length)

  return (
    <ChartCard title="Volumen acumulado por semana" footnote={`Media ${avgSets} series/sem`}>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-meso" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} series`, 'Volumen']} />
          <ReferenceLine y={avgSets} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="sets"
            stroke="var(--color-accent)"
            fill="url(#grad-meso)"
            strokeWidth={2.2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TonnageChart({ trainingSessions }: { trainingSessions: TrainingStatsSession[] }) {
  const weekMap = new Map<string, { tonnage: number; sessions: number }>()
  for (const s of trainingSessions) {
    const d = new Date(s.date)
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
    const wk = mon.toISOString().split('T')[0]
    const entry = weekMap.get(wk) ?? { tonnage: 0, sessions: 0 }
    entry.tonnage += s.sets.reduce((acc, st) => acc + st.loadKg * st.reps, 0)
    entry.sessions += 1
    weekMap.set(wk, entry)
  }

  const data = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e]) => ({
      label: date.slice(5),
      tonnage: Math.round(e.tonnage),
      sessions: e.sessions,
    }))

  if (data.length < 2) return null

  return (
    <ChartCard title="Tonelaje semanal" footnote="kg × reps acumulado por semana">
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-ton" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}t`}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [`${Number(v).toLocaleString('es-ES')} kg`, 'Tonelaje']}
          />
          <Area
            type="monotone"
            dataKey="tonnage"
            stroke="#fbbf24"
            fill="url(#grad-ton)"
            strokeWidth={2.2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function LoadProgressionChart({ trainingSessions }: { trainingSessions: TrainingStatsSession[] }) {
  const exerciseNames = Array.from(
    new Set(trainingSessions.flatMap((s) => s.sets.map((st) => st.exercise)))
  ).sort()
  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? '')

  const data = trainingSessions
    .filter((s) => s.sets.some((st) => st.exercise === selected))
    .map((s) => {
      const relevant = s.sets.filter((st) => st.exercise === selected && st.loadKg > 0)
      if (!relevant.length) return null
      const avgLoad = +(relevant.reduce((acc, st) => acc + st.loadKg, 0) / relevant.length).toFixed(
        1
      )
      const maxLoad = Math.max(...relevant.map((st) => st.loadKg))
      return {
        label: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        avgLoad,
        maxLoad,
        sets: relevant.length,
      }
    })
    .filter(
      (d): d is { label: string; avgLoad: number; maxLoad: number; sets: number } => d !== null
    )

  if (exerciseNames.length === 0) return null

  return (
    <ChartCard title="Progresión de carga" footnote="Carga media y máxima por ejercicio">
      <div className="mb-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border-line bg-surface text-foreground focus:border-accent rounded-xl border px-3 py-1.5 text-xs outline-none"
        >
          {exerciseNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {data.length < 2 ? (
        <p className="text-foreground/35 text-xs">
          Se necesitan al menos 2 sesiones con este ejercicio.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="kg" />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
            <Line
              type="monotone"
              dataKey="avgLoad"
              name="Media kg"
              stroke="#a78bfa"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="maxLoad"
              name="Máx kg"
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

function E1RMChart({ trainingSessions }: { trainingSessions: TrainingStatsSession[] }) {
  const exerciseNames = Array.from(
    new Set(trainingSessions.flatMap((s) => s.sets.map((st) => st.exercise)))
  ).sort()
  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? '')

  const data = trainingSessions
    .filter((s) => s.sets.some((st) => st.exercise === selected))
    .map((s) => {
      const relevant = s.sets.filter(
        (st) => st.exercise === selected && st.loadKg > 0 && st.reps > 0
      )
      if (!relevant.length) return null
      const e1rms = relevant.map((st) => +(st.loadKg * (1 + st.reps / 30)).toFixed(1))
      const best = Math.max(...e1rms)
      const avgE = +(e1rms.reduce((a, b) => a + b, 0) / e1rms.length).toFixed(1)
      return {
        label: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        best,
        avg: avgE,
      }
    })
    .filter((d): d is { label: string; best: number; avg: number } => d !== null)

  if (exerciseNames.length === 0) return null

  return (
    <ChartCard title="Fuerza estimada (e1RM)" footnote="Fórmula Epley">
      <div className="mb-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border-line bg-surface text-foreground focus:border-accent rounded-xl border px-3 py-1.5 text-xs outline-none"
        >
          {exerciseNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {data.length < 2 ? (
        <p className="text-foreground/35 text-xs">
          Se necesitan al menos 2 sesiones con este ejercicio.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="kg" />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
            <Line
              type="monotone"
              dataKey="best"
              name="e1RM máx"
              stroke="#fbbf24"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="e1RM med"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

function MuscleVolumeProgressionChart({
  trainingSessions,
}: {
  trainingSessions: TrainingStatsSession[]
}) {
  const weekMuscleMap = new Map<string, Map<string, number>>()

  for (const s of trainingSessions) {
    const d = new Date(s.date)
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
    const wk = mon.toISOString().split('T')[0]
    if (!weekMuscleMap.has(wk)) weekMuscleMap.set(wk, new Map())
    const mm = weekMuscleMap.get(wk) as Map<string, number>
    for (const set of s.sets) {
      const muscle = inferSpecificMuscle(set.exercise)
      if (!muscle) continue
      mm.set(muscle, (mm.get(muscle) ?? 0) + 1)
    }
  }

  const weeks = Array.from(weekMuscleMap.keys()).sort()
  if (weeks.length < 2) return null

  const allMuscles = Array.from(
    new Set(Array.from(weekMuscleMap.values()).flatMap((m) => Array.from(m.keys())))
  )
  const muscleTotals = allMuscles
    .map((m) => ({
      muscle: m,
      total: weeks.reduce(
        (sum, wk) => sum + ((weekMuscleMap.get(wk) as Map<string, number>)?.get(m) ?? 0),
        0
      ),
    }))
    .sort((a, b) => b.total - a.total)
  const topMuscles = muscleTotals.slice(0, 6).map((m) => m.muscle)

  const chartData = weeks.map((wk) => {
    const mm = weekMuscleMap.get(wk) as Map<string, number>
    const row: Record<string, string | number> = { label: wk.slice(5) }
    for (const m of topMuscles) row[m] = mm.get(m) ?? 0
    return row
  })

  return (
    <ChartCard
      title="Progresión de volumen por músculo"
      footnote="Series por semana en los grupos más trabajados"
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          {topMuscles.map((muscle) => (
            <Line
              key={muscle}
              type="monotone"
              dataKey={muscle}
              stroke={MUSCLE_STROKE[muscle] ?? '#94a3b8'}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function MuscleRadarCoverage({
  seriesByMuscle,
}: {
  seriesByMuscle: Array<{ name: string; series: number }>
}) {
  if (seriesByMuscle.length < 3) return null
  const max = Math.max(...seriesByMuscle.map((m) => m.series), 1)
  const data = seriesByMuscle.map((m) => ({
    muscle: m.name,
    coverage: Math.round((m.series / max) * 100),
    target: 70,
  }))

  return (
    <ChartCard
      title="Radar de cobertura muscular"
      footnote="% relativo de series por grupo en el rango seleccionado"
    >
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 16, right: 20, bottom: 16, left: 20 }}>
          <PolarGrid stroke="rgba(148,163,184,0.12)" />
          <PolarAngleAxis
            dataKey="muscle"
            tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
          />
          <Radar
            name="Objetivo base"
            dataKey="target"
            stroke="rgba(148,163,184,0.4)"
            fill="rgba(148,163,184,0.08)"
            strokeDasharray="4 3"
          />
          <Radar
            name="Actual"
            dataKey="coverage"
            stroke="var(--color-accent)"
            fill="rgba(99,102,241,0.2)"
            strokeWidth={2.5}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Cobertura']} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── MiniBar kept for small bar grids (muscle tonnage etc.) ──────────────────
function MiniBar({
  value,
  max,
  color,
  label,
  sublabel,
}: {
  value: number
  max: number
  color: string
  label: string
  sublabel?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="bg-background/70 flex h-24 w-full items-end rounded-xl px-1 py-1">
        <div
          className={`w-full rounded-lg ${color} transition-all`}
          style={{ height: `${Math.max(6, (value / Math.max(max, 1)) * 100)}%` }}
          title={`${label}: ${sublabel ?? value}`}
        />
      </div>
      <p className="text-foreground/70 text-center text-[10px] font-semibold">
        {sublabel ?? value}
      </p>
      <p className="text-foreground/35 w-full truncate text-center text-[9px] tracking-widest uppercase">
        {label}
      </p>
    </div>
  )
}

// ── Composición subtab ──────────────────────────────────────────────────────
function SubtabComposicion({ overview }: { overview: Overview }) {
  const { weightTrend, bodyMeasurements, stats } = overview

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const weightSeries = weightTrend
    .filter((p) => p.weightKg != null && p.weightKg > 0)
    .slice(-30)
    .map((p) => ({ label: fmtDate(p.date), value: p.weightKg }))

  const fatSeries = bodyMeasurements
    .filter((m) => m.bodyFatPct != null)
    .slice(-20)
    .map((m) => ({ label: fmtDate(m.date), value: m.bodyFatPct }))

  const waistSeries = bodyMeasurements
    .filter((m) => m.waistCm != null)
    .slice(-16)
    .map((m) => ({ label: fmtDate(m.date), value: m.waistCm }))

  const latestM = bodyMeasurements[bodyMeasurements.length - 1] ?? null

  const measures: { label: string; value: number | null | undefined; suffix: string }[] = [
    { label: 'Cintura', value: latestM?.waistCm, suffix: ' cm' },
    { label: 'Cadera', value: latestM?.hipCm, suffix: ' cm' },
    { label: 'Pecho', value: latestM?.chestCm, suffix: ' cm' },
    { label: 'Brazo', value: latestM?.armCm, suffix: ' cm' },
    { label: 'Cuádriceps', value: latestM?.quadCm, suffix: ' cm' },
    { label: 'Gemelo', value: latestM?.calfCm, suffix: ' cm' },
    { label: 'Glúteo', value: latestM?.glutesCm, suffix: ' cm' },
    { label: 'Cuello', value: latestM?.neckCm, suffix: ' cm' },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig
          label="Peso actual"
          value={stats.latestWeightKg != null ? `${stats.latestWeightKg} kg` : '—'}
        />
        <StatBig
          label="% Grasa"
          value={latestM?.bodyFatPct != null ? `${latestM.bodyFatPct}%` : '—'}
        />
        <StatBig label="Cintura" value={latestM?.waistCm != null ? `${latestM.waistCm} cm` : '—'} />
        <StatBig label="Brazo" value={latestM?.armCm != null ? `${latestM.armCm} cm` : '—'} />
      </div>

      {/* Evolución de peso — AreaChart */}
      {weightSeries.length > 1 && (
        <ChartCard title="Evolución de peso" footnote={`${weightSeries.length} registros`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weightSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                domain={['auto', 'auto']}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit=" kg"
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso']} />
              <Area
                type="monotone"
                dataKey="value"
                name="Peso"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#wGrad)"
                dot={{ r: 3, fill: 'var(--color-accent)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* % Grasa corporal — AreaChart */}
      {fatSeries.length > 1 && (
        <ChartCard title="% Grasa corporal" footnote={`${fatSeries.length} mediciones`}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={fatSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 'auto']}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, '% grasa']} />
              <Area
                type="monotone"
                dataKey="value"
                name="% Grasa"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#bfGrad)"
                dot={{ r: 3, fill: '#f59e0b' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Medidas actuales */}
      {latestM && (
        <ChartCard title="Medidas actuales">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {measures
              .filter((m) => m.value != null)
              .map((m) => (
                <div key={m.label} className="bg-surface-strong rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">
                    {m.value}
                    {m.suffix}
                  </p>
                  <p className="text-foreground/45 mt-0.5 text-xs">{m.label}</p>
                </div>
              ))}
          </div>
        </ChartCard>
      )}

      {/* Evolución cintura — LineChart */}
      {waistSeries.length > 1 && (
        <ChartCard title="Evolución de cintura" footnote="Tendencia de medida de cintura (cm)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={waistSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                domain={['auto', 'auto']}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit=" cm"
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} cm`, 'Cintura']} />
              <Line
                type="monotone"
                dataKey="value"
                name="Cintura"
                stroke="#fb7185"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fb7185' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <BodyCompositionTrendChart measurements={bodyMeasurements} />

      <AdvancedMetricsPanel overview={overview} />

      {weightSeries.length === 0 && fatSeries.length === 0 && !latestM && (
        <div className="border-line bg-surface text-foreground/40 rounded-2xl border py-12 text-center text-sm">
          Sin datos de composición corporal aún
        </div>
      )}
    </div>
  )
}

// ── Adherencia subtab ────────────────────────────────────────────────────────
function SubtabAdherencia({ overview }: { overview: Overview }) {
  const { checkIns, sleepTrend, stepsTrend, recentSessions, stats } = overview

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  // Adherencia + sueño por check-in — dual axis LineChart
  const adherenciaSeries = [...checkIns]
    .reverse()
    .slice(-20)
    .map((ci) => ({
      label: ci.weekLabel ?? fmtDate(ci.date),
      adherencia: ci.adherencePct,
      sueno: ci.sleepHours,
    }))

  // Sueño diario — AreaChart
  const sleepSeries = sleepTrend.slice(-30).map((p) => ({
    label: fmtDate(p.date),
    value: p.value,
  }))

  // Pasos diarios — BarChart
  const stepsSeries = stepsTrend.slice(-30).map((p) => ({
    label: fmtDate(p.date),
    value: p.value,
  }))

  // Correlación sueño vs entrenamiento
  const sessionByDate: Record<string, number> = {}
  for (const s of recentSessions) {
    sessionByDate[s.date] = (sessionByDate[s.date] ?? 0) + (s.durationMin ?? 0)
  }
  const correlationSeries = sleepTrend.slice(-30).map((p) => ({
    label: fmtDate(p.date),
    sueno: p.value,
    entrenamiento: sessionByDate[p.date] ?? 0,
  }))

  const avgSleep = sleepSeries.length
    ? (sleepSeries.reduce((a, p) => a + p.value, 0) / sleepSeries.length).toFixed(1)
    : null
  const avgSteps = stepsSeries.length
    ? Math.round(stepsSeries.reduce((a, p) => a + p.value, 0) / stepsSeries.length)
    : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig label="Adherencia media" value={`${stats.avgAdherence ?? '—'}%`} />
        <StatBig label="Racha semanas" value={String(stats.streakWeeks)} />
        <StatBig label="Sueño medio" value={avgSleep ? `${avgSleep} h` : '—'} />
        <StatBig label="Pasos medios" value={avgSteps ? avgSteps.toLocaleString('es-ES') : '—'} />
      </div>

      {/* Adherencia + sueño por check-in — LineChart dual eje */}
      {adherenciaSeries.length > 1 && (
        <ChartCard
          title="Adherencia y sueño por check-in"
          footnote={`Últimos ${adherenciaSeries.length} check-ins`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={adherenciaSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 12]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="h"
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="adherencia"
                name="Adherencia %"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sueno"
                name="Sueño (h)"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <CheckInTrendChart checkIns={checkIns} />

      {/* Sueño diario — AreaChart */}
      {sleepSeries.length > 1 && (
        <ChartCard
          title="Sueño diario (horas)"
          footnote={`${sleepSeries.length} registros · media ${avgSleep} h`}
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sleepSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 12]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="h"
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} h`, 'Sueño']} />
              <Area
                type="monotone"
                dataKey="value"
                name="Sueño"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#sleepGrad)"
                dot={{ r: 3, fill: '#34d399' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Pasos diarios — BarChart */}
      {stepsSeries.length > 1 && (
        <ChartCard
          title="Pasos diarios"
          footnote={`${stepsSeries.length} registros · media ${avgSteps?.toLocaleString('es-ES')}`}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stepsSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [Number(v).toLocaleString('es-ES'), 'Pasos']}
              />
              <Bar dataKey="value" name="Pasos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Correlación sueño vs entrenamiento */}
      {correlationSeries.filter((p) => p.sueno > 0 || p.entrenamiento > 0).length > 2 && (
        <ChartCard
          title="Sueño vs entrenamiento"
          footnote="Correlación horas de descanso con minutos de entreno"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={correlationSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="sleep"
                domain={[0, 12]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="h"
              />
              <YAxis
                yAxisId="training"
                orientation="right"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="min"
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
              <Line
                yAxisId="sleep"
                type="monotone"
                dataKey="sueno"
                name="Sueño (h)"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="training"
                type="monotone"
                dataKey="entrenamiento"
                name="Entreno (min)"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <CoachSignalsPanel overview={overview} />
    </div>
  )
}

// ── Entrenamiento subtab ─────────────────────────────────────────────────────
function SubtabEntrenamiento({ overview }: { overview: Overview }) {
  const { recentSessions, stats, sleepTrend } = overview
  const [trainingStats, setTrainingStats] = useState<TrainingStatsSession[]>([])
  const [trainingStatsLoading, setTrainingStatsLoading] = useState(true)

  useEffect(() => {
    setTrainingStatsLoading(true)
    fetch(`/api/athletes/${overview.id}/training-stats?range=90`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sessions?: TrainingStatsSession[] } | null) => {
        setTrainingStats(d?.sessions ?? [])
        setTrainingStatsLoading(false)
      })
      .catch(() => {
        setTrainingStats([])
        setTrainingStatsLoading(false)
      })
  }, [overview.id])

  const sessions = [...recentSessions].reverse()

  // Sesiones por semana
  const byWeek: Record<string, { count: number; totalMin: number; totalKcal: number }> = {}
  for (const s of sessions) {
    const d = new Date(s.date)
    const jan4 = new Date(d.getFullYear(), 0, 4)
    const wk = Math.ceil(((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7)
    const key = `${d.getFullYear()}-S${String(wk).padStart(2, '0')}`
    if (!byWeek[key]) byWeek[key] = { count: 0, totalMin: 0, totalKcal: 0 }
    byWeek[key].count++
    byWeek[key].totalMin += s.durationMin ?? 0
    byWeek[key].totalKcal += s.kcalBurned ?? 0
  }
  const weekSeries = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, v]) => ({
      label: k.split('-')[1],
      sesiones: v.count,
      minutos: v.totalMin,
      kcal: v.totalKcal,
    }))

  // Correlación sueño vs sesiones
  const sleepByDate: Record<string, number> = {}
  for (const p of sleepTrend) sleepByDate[p.date] = p.value
  const sessionDates = [...new Set(sessions.map((s) => s.date))].sort().slice(-30)
  const correlSeries = sessionDates.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date)
    return {
      label: new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      sueno: sleepByDate[date] ?? 0,
      minutos: daySessions.reduce((a, s) => a + (s.durationMin ?? 0), 0),
    }
  })

  const avgDuration = sessions.filter((s) => s.durationMin).length
    ? Math.round(
        sessions.filter((s) => s.durationMin).reduce((a, s) => a + (s.durationMin ?? 0), 0) /
          sessions.filter((s) => s.durationMin).length
      )
    : null
  const totalKcal = sessions.reduce((a, s) => a + (s.kcalBurned ?? 0), 0)
  const avgHR = sessions.filter((s) => s.heartRateAvg).length
    ? Math.round(
        sessions.filter((s) => s.heartRateAvg).reduce((a, s) => a + (s.heartRateAvg ?? 0), 0) /
          sessions.filter((s) => s.heartRateAvg).length
      )
    : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig label="Sesiones totales" value={String(stats.totalSessions)} />
        <StatBig label="Duración media" value={avgDuration ? `${avgDuration} min` : '—'} />
        <StatBig
          label="Kcal quemadas"
          value={totalKcal > 0 ? totalKcal.toLocaleString('es-ES') : '—'}
        />
        <StatBig label="FC media" value={avgHR ? `${avgHR} bpm` : '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrainingFrequencyChart sessions={recentSessions} />
        <SessionLoadChart sessions={recentSessions} />
      </div>

      <HeartRateChart sessions={recentSessions} />

      {!trainingStatsLoading && trainingStats.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <RIRComplianceChart trainingSessions={trainingStats} />
            <MesocycleVolumeChart trainingSessions={trainingStats} />
          </div>
          <TonnageChart trainingSessions={trainingStats} />
          <MuscleVolumeProgressionChart trainingSessions={trainingStats} />
          <div className="grid gap-4 lg:grid-cols-2">
            <LoadProgressionChart trainingSessions={trainingStats} />
            <E1RMChart trainingSessions={trainingStats} />
          </div>
        </>
      )}

      {trainingStatsLoading && (
        <div className="border-line bg-surface text-foreground/40 rounded-2xl border py-6 text-center text-xs">
          Cargando histórico de sets...
        </div>
      )}

      {/* Sesiones y minutos por semana — BarChart doble */}
      {weekSeries.length > 0 && (
        <ChartCard title="Volumen semanal" footnote={`Últimas ${weekSeries.length} semanas`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="min"
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
              <Bar
                yAxisId="left"
                dataKey="sesiones"
                name="Sesiones"
                fill="var(--color-accent)"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
              <Bar
                yAxisId="right"
                dataKey="minutos"
                name="Minutos"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Correlación sueño vs minutos entrenados */}
      {correlSeries.filter((p) => p.sueno > 0 || p.minutos > 0).length > 2 && (
        <ChartCard title="Sueño vs minutos de entreno" footnote="Por día con sesión registrada">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={correlSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="sleep"
                domain={[0, 12]}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="h"
              />
              <YAxis
                yAxisId="training"
                orientation="right"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                unit="min"
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
              <Line
                yAxisId="sleep"
                type="monotone"
                dataKey="sueno"
                name="Sueño (h)"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="training"
                type="monotone"
                dataKey="minutos"
                name="Entreno (min)"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Lista últimas sesiones */}
      {sessions.length > 0 && (
        <ChartCard title="Últimas sesiones">
          <div className="space-y-1.5">
            {sessions
              .slice(-12)
              .reverse()
              .map((s) => (
                <div
                  key={s.id}
                  className="bg-surface-strong flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.sessionName || 'Sesión'}</p>
                    <p className="text-foreground/40 text-xs">{s.date}</p>
                  </div>
                  <div className="text-foreground/50 flex gap-3 text-xs">
                    {s.durationMin ? <span>{s.durationMin} min</span> : null}
                    {s.kcalBurned ? <span>{s.kcalBurned} kcal</span> : null}
                    {s.heartRateAvg ? <span>{s.heartRateAvg} bpm</span> : null}
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>
      )}

      {sessions.length === 0 && (
        <div className="border-line bg-surface text-foreground/40 rounded-2xl border py-12 text-center text-sm">
          Sin sesiones registradas en este rango
        </div>
      )}
    </div>
  )
}

// ── Por músculo subtab ───────────────────────────────────────────────────────
// Orden: más específicos primero para evitar falsos matches en includes()
const MUSCLE_MAP: Record<string, string> = {
  // ─ Pectoral
  'press banca': 'Pectoral',
  'press inclinado': 'Pectoral',
  'press plano': 'Pectoral',
  'press declinado': 'Pectoral',
  'cable crossover': 'Pectoral',
  'pec deck': 'Pectoral',
  aperturas: 'Pectoral',
  fondos: 'Pectoral',
  bench: 'Pectoral',
  pec: 'Pectoral',
  // ─ Deltoides (antes de "press" genérico)
  'press militar': 'Deltoides',
  'press arnold': 'Deltoides',
  'elevaciones laterales': 'Deltoides',
  'elevaciones frontales': 'Deltoides',
  hombro: 'Deltoides',
  deltoides: 'Deltoides',
  elevaciones: 'Deltoides',
  lateral: 'Deltoides',
  posterior: 'Deltoides',
  'face pull': 'Deltoides',
  // ─ Pectoral generic fallback
  press: 'Pectoral',
  // ─ Espalda
  remo: 'Espalda',
  dominadas: 'Espalda',
  jalón: 'Espalda',
  jalon: 'Espalda',
  pulldown: 'Espalda',
  pullover: 'Espalda',
  renegade: 'Espalda',
  hiperextension: 'Espalda',
  'peso muerto': 'Espalda',
  deadlift: 'Espalda',
  // ─ Trapecio
  trapecio: 'Trapecio',
  encogimiento: 'Trapecio',
  shrug: 'Trapecio',
  // ─ Bíceps (curl martillo antes de curl genérico)
  'curl martillo': 'Bíceps',
  curl: 'Bíceps',
  bicep: 'Bíceps',
  bíceps: 'Bíceps',
  martillo: 'Bíceps',
  // ─ Tríceps (press francés antes de extensión genérica)
  'press francés': 'Tríceps',
  pushdown: 'Tríceps',
  tríceps: 'Tríceps',
  tricep: 'Tríceps',
  dips: 'Tríceps',
  // ─ Cuádriceps (específicos antes de genéricos)
  'leg press': 'Cuádriceps',
  'extensión de cuádr': 'Cuádriceps',
  'extensión cuádr': 'Cuádriceps',
  sentadilla: 'Cuádriceps',
  squat: 'Cuádriceps',
  prensa: 'Cuádriceps',
  cuádricep: 'Cuádriceps',
  abductores: 'Cuádriceps',
  leg: 'Cuádriceps',
  // ─ Isquiotibiales
  'curl femoral': 'Isquiotibiales',
  femoral: 'Isquiotibiales',
  'peso rumano': 'Isquiotibiales',
  rdl: 'Isquiotibiales',
  isquio: 'Isquiotibiales',
  // ─ Glúteos
  'hip thrust': 'Glúteos',
  hip: 'Glúteos',
  glúteo: 'Glúteos',
  glutes: 'Glúteos',
  lunges: 'Glúteos',
  zancada: 'Glúteos',
  // ─ Gemelos
  pantorrilla: 'Gemelos',
  gemelo: 'Gemelos',
  calf: 'Gemelos',
  'elevación de talones': 'Gemelos',
  // ─ Core
  abdominales: 'Core',
  plancha: 'Core',
  plank: 'Core',
  crunch: 'Core',
  rueda: 'Core',
  core: 'Core',
  oblicuos: 'Core',
  // ─ Extensión genérica → Cuádriceps (la mayoría de extensiones en pierna)
  extensión: 'Cuádriceps',
}

const MUSCLE_STROKE: Record<string, string> = {
  Pectoral: '#60a5fa',
  Espalda: '#34d399',
  Trapecio: '#a3e635',
  Deltoides: '#a78bfa',
  Bíceps: '#fb923c',
  Tríceps: '#facc15',
  Cuádriceps: '#f87171',
  Isquiotibiales: '#f43f5e',
  Glúteos: '#ec4899',
  Gemelos: '#22d3ee',
  Core: '#818cf8',
  Otros: '#94a3b8',
}

function classifyMuscle(name: string): string {
  const lower = name.toLowerCase()
  for (const [kw, muscle] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(kw)) return muscle
  }
  return 'Otros'
}

type TrainingSet = { exercise: string; setNumber: number; loadKg: number; reps: number }
type TrainingSession = { id: string; date: string; sessionName: string; sets: TrainingSet[] }

function SubtabMusculo({ athleteId, range }: { athleteId: string; range: string }) {
  const [data, setData] = useState<TrainingSession[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/athletes/${athleteId}/training-stats?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sessions: TrainingSession[] } | null) => {
        setData(d?.sessions ?? [])
        setLoading(false)
      })
      .catch(() => {
        setData([])
        setLoading(false)
      })
  }, [athleteId, range])

  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  if (!data || data.length === 0)
    return (
      <div className="border-line bg-surface text-foreground/40 rounded-2xl border py-12 text-center text-sm">
        Sin sesiones con series en este rango
      </div>
    )

  // Series y tonelaje por músculo
  const vol: Record<string, { sets: number; tonnage: number }> = {}
  for (const session of data) {
    for (const set of session.sets) {
      const m = classifyMuscle(set.exercise)
      if (!vol[m]) vol[m] = { sets: 0, tonnage: 0 }
      vol[m].sets++
      vol[m].tonnage += set.loadKg * set.reps
    }
  }
  const muscleOrder = [
    'Pectoral',
    'Espalda',
    'Trapecio',
    'Deltoides',
    'Bíceps',
    'Tríceps',
    'Cuádriceps',
    'Isquiotibiales',
    'Glúteos',
    'Gemelos',
    'Core',
    'Otros',
  ]
  const sortedMuscles = muscleOrder.filter((m) => vol[m])

  // Series por músculo — para BarChart horizontal
  const seriesByMuscle = sortedMuscles.map((m) => ({
    name: m,
    series: vol[m].sets,
    tonelaje: Math.round(vol[m].tonnage),
  }))

  const radarInput = seriesByMuscle.map((m) => ({ name: m.name, series: m.series }))

  // Volumen semanal por músculo
  const weeklyByMuscle: Record<string, Record<string, number>> = {}
  for (const session of data) {
    const d = new Date(session.date)
    const jan4 = new Date(d.getFullYear(), 0, 4)
    const wk = Math.ceil(((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7)
    const wKey = `${d.getFullYear()}-S${String(wk).padStart(2, '0')}`
    for (const set of session.sets) {
      const m = classifyMuscle(set.exercise)
      if (!weeklyByMuscle[m]) weeklyByMuscle[m] = {}
      weeklyByMuscle[m][wKey] = (weeklyByMuscle[m][wKey] ?? 0) + 1
    }
  }
  const allWeeks = [
    ...new Set(
      data.flatMap((s) => {
        const d = new Date(s.date)
        const jan4 = new Date(d.getFullYear(), 0, 4)
        const wk = Math.ceil(((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7)
        return [`${d.getFullYear()}-S${String(wk).padStart(2, '0')}`]
      })
    ),
  ]
    .sort()
    .slice(-8)

  return (
    <div className="space-y-4">
      {/* KPIs músculo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig label="Sesiones" value={String(data.length)} />
        <StatBig
          label="Series totales"
          value={String(Object.values(vol).reduce((a, v) => a + v.sets, 0))}
        />
        <StatBig
          label="Tonelaje total"
          value={`${Math.round(Object.values(vol).reduce((a, v) => a + v.tonnage, 0) / 1000).toLocaleString('es-ES')} t`}
        />
        <StatBig label="Grupos trabajados" value={String(sortedMuscles.length)} />
      </div>

      {/* Series por músculo — BarChart horizontal */}
      <ChartCard title="Series por grupo muscular" footnote={`${data.length} sesiones analizadas`}>
        <ResponsiveContainer width="100%" height={Math.max(200, sortedMuscles.length * 36)}>
          <BarChart
            data={seriesByMuscle}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
          >
            <CartesianGrid {...CHART_GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.7)' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} series`, 'Volumen']} />
            <Bar dataKey="series" name="Series" radius={[0, 6, 6, 0]}>
              {seriesByMuscle.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={MUSCLE_STROKE[entry.name] ?? '#94a3b8'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <MuscleRadarCoverage seriesByMuscle={radarInput} />

      {/* Tonelaje por músculo — BarChart horizontal */}
      <ChartCard title="Tonelaje por grupo muscular (kg)" footnote="kg × repeticiones totales">
        <ResponsiveContainer width="100%" height={Math.max(200, sortedMuscles.length * 36)}>
          <BarChart
            data={seriesByMuscle}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
          >
            <CartesianGrid {...CHART_GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.7)' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v) => [`${Number(v).toLocaleString('es-ES')} kg`, 'Tonelaje']}
            />
            <Bar
              dataKey="tonelaje"
              name="Tonelaje"
              fill="#f59e0b"
              radius={[0, 6, 6, 0]}
              opacity={0.75}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tabla semanal × músculo */}
      {allWeeks.length > 1 && (
        <ChartCard title="Series semanales por músculo">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-foreground/40 py-1.5 pr-4 text-left font-medium">Músculo</th>
                  {allWeeks.map((w) => (
                    <th key={w} className="text-foreground/40 px-2 py-1.5 text-center font-medium">
                      {w.split('-')[1]}
                    </th>
                  ))}
                  <th className="text-foreground/40 py-1.5 pl-3 text-right font-medium">Total</th>
                  <th className="text-foreground/40 py-1.5 pl-3 text-center font-medium">MEV</th>
                  <th className="text-foreground/40 py-1.5 pl-3 text-center font-medium">MAV</th>
                  <th className="text-foreground/40 py-1.5 pl-3 text-center font-medium">MRV</th>
                </tr>
              </thead>
              <tbody>
                {sortedMuscles.map((muscle) => {
                  const refs = VOLUME_REFS[muscle]
                  const weeklyAvg =
                    allWeeks.length > 0
                      ? Math.round(
                          allWeeks.reduce((s, w) => s + (weeklyByMuscle[muscle]?.[w] ?? 0), 0) /
                            allWeeks.length
                        )
                      : 0
                  const zone = refs
                    ? weeklyAvg < refs.mev
                      ? 'danger'
                      : weeklyAvg < refs.mav
                        ? 'warning'
                        : weeklyAvg < refs.mrv
                          ? 'success'
                          : 'warn-over'
                    : 'none'
                  return (
                    <tr key={muscle} className="border-line/20 border-t">
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: MUSCLE_STROKE[muscle] ?? '#94a3b8' }}
                          />
                          {muscle}
                        </span>
                      </td>
                      {allWeeks.map((w) => {
                        const v = weeklyByMuscle[muscle]?.[w] ?? 0
                        return (
                          <td key={w} className="px-2 py-2 text-center">
                            {v > 0 ? (
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 font-semibold ${
                                  v >= 15
                                    ? 'bg-success/20 text-success'
                                    : v >= 10
                                      ? 'bg-warning/20 text-warning'
                                      : 'bg-surface-strong'
                                }`}
                              >
                                {v}
                              </span>
                            ) : (
                              <span className="text-foreground/20">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-2 pl-3 text-right font-semibold">
                        {vol[muscle]?.sets ?? 0}
                      </td>
                      <td
                        className={`py-2 pl-3 text-center font-semibold ${zone === 'danger' ? 'text-danger' : zone === 'warning' ? 'text-warning' : 'text-foreground/50'}`}
                      >
                        {refs?.mev ?? '—'}
                      </td>
                      <td
                        className={`py-2 pl-3 text-center font-semibold ${zone === 'success' ? 'text-success' : 'text-foreground/50'}`}
                      >
                        {refs?.mav ?? '—'}
                      </td>
                      <td
                        className={`py-2 pl-3 text-center font-semibold ${zone === 'warn-over' ? 'text-danger' : 'text-foreground/40'}`}
                      >
                        {refs?.mrv ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="text-foreground/40 mt-3 flex flex-wrap gap-3 text-xs">
            <span>
              <span className="text-success font-medium">Verde</span> ≥15 series (≈MAV)
            </span>
            <span>
              <span className="text-warning font-medium">Naranja</span> ≥10 (≈MEV)
            </span>
            <span className="ml-2">
              <strong>MEV</strong> mín efectivo · <strong>MAV</strong> máx adaptativo ·{' '}
              <strong>MRV</strong> máx recuperable (Israetel)
            </span>
          </div>
        </ChartCard>
      )}
    </div>
  )
}

// ── Nutrición subtab ─────────────────────────────────────────────────────────
const MACRO_COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa']

function NutritionPlanSummary({ plan }: { plan: OverviewNutritionPlan }) {
  const p = plan.proteinG ?? 0
  const c = plan.carbsG ?? 0
  const f = plan.fatG ?? 0
  const totalG = p + c + f

  const macroSlices =
    totalG > 0
      ? [
          { name: 'Proteína', value: p, color: '#22c55e' },
          { name: 'Carbos', value: c, color: '#38bdf8' },
          { name: 'Grasa', value: f, color: '#f59e0b' },
        ]
      : []

  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="border-line bg-surface space-y-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{plan.title}</h3>
          {plan.isActive && (
            <span className="bg-success/15 text-success inline-block rounded-full px-2 py-0.5 text-xs font-medium">
              Activo
            </span>
          )}
        </div>
        {plan.kcalTarget ? (
          <span className="text-2xl font-bold">
            {plan.kcalTarget.toLocaleString('es-ES')}{' '}
            <span className="text-foreground/50 text-sm font-normal">kcal</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {macroSlices.length > 0 && (
          <div className="shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={macroSlices}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {macroSlices.map((entry, i) => (
                    <Cell key={entry.name} fill={MACRO_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-line)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v, name) => [
                    `${String(v)}g (${totalG > 0 ? Math.round((Number(v) / totalG) * 100) : 0}%)`,
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex-1 space-y-2">
          {[
            { label: 'Proteína', value: p, color: '#22c55e', bg: 'bg-success/15' },
            { label: 'Carbohidratos', value: c, color: '#38bdf8', bg: 'bg-sky-400/15' },
            { label: 'Grasa', value: f, color: '#f59e0b', bg: 'bg-amber-400/15' },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: m.color }}
                />
                <span className="text-foreground/70">{m.label}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="bg-line/20 h-2 w-24 rounded-full">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: m.color,
                      width: totalG > 0 ? `${Math.round((m.value / totalG) * 100)}%` : '0%',
                    }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-semibold">{m.value}g</span>
              </div>
            </div>
          ))}
          {plan.kcalTarget && totalG > 0 && (
            <p className="text-foreground/40 mt-1 text-xs">
              {Math.round(totalG * 4)} kcal desde macros · P:{Math.round((p / totalG) * 100)}% C:
              {Math.round((c / totalG) * 100)}% G:{Math.round((f / totalG) * 100)}%
            </p>
          )}
        </div>
      </div>

      {plan.meals.length > 0 && (
        <div className="space-y-2">
          <p className="text-foreground/35 text-xs font-semibold tracking-widest uppercase">
            {plan.meals.length} comidas
          </p>
          {[...plan.meals]
            .sort((a, b) => a.order - b.order)
            .map((meal) => {
              const mKcal = meal.foods.reduce((s, fd) => s + (fd.kcal ?? 0), 0)
              const mP = meal.foods.reduce((s, fd) => s + (fd.proteinG ?? 0), 0)
              const mC = meal.foods.reduce((s, fd) => s + (fd.carbsG ?? 0), 0)
              const mF = meal.foods.reduce((s, fd) => s + (fd.fatG ?? 0), 0)
              const isExp = expanded === meal.id
              return (
                <div
                  key={meal.id}
                  className="border-line bg-surface-strong overflow-hidden rounded-xl border"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isExp ? null : meal.id)}
                    className="hover:bg-line/10 flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{meal.name}</span>
                      {meal.time && (
                        <span className="text-foreground/40 shrink-0 text-xs">{meal.time}</span>
                      )}
                    </div>
                    <div className="text-foreground/50 flex shrink-0 items-center gap-3 text-xs">
                      {mKcal > 0 && <span>{Math.round(mKcal)} kcal</span>}
                      {mP > 0 && <span className="text-success">{Math.round(mP)}P</span>}
                      {mC > 0 && <span className="text-sky-400">{Math.round(mC)}C</span>}
                      {mF > 0 && <span className="text-amber-400">{Math.round(mF)}G</span>}
                      <span className="text-foreground/25">{isExp ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isExp && meal.foods.length > 0 && (
                    <div className="border-line/30 divide-line/20 divide-y border-t">
                      {meal.foods.map((fd) => (
                        <div
                          key={fd.id}
                          className="flex items-center justify-between px-4 py-2 text-xs"
                        >
                          <span className="text-foreground/80">
                            {fd.food}{' '}
                            <span className="text-foreground/40">
                              {fd.quantity}
                              {fd.unit}
                            </span>
                          </span>
                          <div className="text-foreground/50 flex gap-3">
                            {fd.kcal != null && <span>{fd.kcal} kcal</span>}
                            {fd.proteinG != null && (
                              <span className="text-success">{fd.proteinG}P</span>
                            )}
                            {fd.carbsG != null && (
                              <span className="text-sky-400">{fd.carbsG}C</span>
                            )}
                            {fd.fatG != null && <span className="text-amber-400">{fd.fatG}G</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ── Nutrition log types & charts ─────────────────────────────────────────────
type NutritionLogEntry = {
  id: string
  mealName: string | null
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  loggedAt: string
}

type DailyNutrition = {
  date: string
  label: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  entries: number
}

function aggregateByDay(logs: NutritionLogEntry[]): DailyNutrition[] {
  const map = new Map<string, DailyNutrition>()
  for (const log of logs) {
    const day = log.loggedAt.split('T')[0]
    const existing = map.get(day) ?? {
      date: day,
      label: new Date(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      entries: 0,
    }
    existing.kcal = +(existing.kcal + (log.kcal ?? 0)).toFixed(0)
    existing.proteinG = +(existing.proteinG + (log.proteinG ?? 0)).toFixed(1)
    existing.carbsG = +(existing.carbsG + (log.carbsG ?? 0)).toFixed(1)
    existing.fatG = +(existing.fatG + (log.fatG ?? 0)).toFixed(1)
    existing.entries++
    map.set(day, existing)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function NutritionLogCharts({
  logs,
  activePlan,
}: {
  logs: NutritionLogEntry[]
  activePlan: OverviewNutritionPlan | null
}) {
  const daily = aggregateByDay(logs)

  if (daily.length === 0) {
    return (
      <div className="border-line bg-surface text-foreground/40 rounded-2xl border border-dashed py-10 text-center text-sm">
        Sin registros nutricionales diarios aún
      </div>
    )
  }

  const avgKcal = Math.round(daily.reduce((s, d) => s + d.kcal, 0) / daily.length)
  const avgProtein = +(daily.reduce((s, d) => s + d.proteinG, 0) / daily.length).toFixed(1)
  const avgCarbs = +(daily.reduce((s, d) => s + d.carbsG, 0) / daily.length).toFixed(1)
  const avgFat = +(daily.reduce((s, d) => s + d.fatG, 0) / daily.length).toFixed(1)

  const kcalTarget = activePlan?.kcalTarget ?? null
  const proteinTarget = activePlan?.proteinG ?? null

  const compliance =
    kcalTarget && kcalTarget > 0
      ? Math.round(
          (daily.filter((d) => d.kcal >= kcalTarget * 0.85 && d.kcal <= kcalTarget * 1.15).length /
            daily.length) *
            100
        )
      : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig
          label="Kcal media/día"
          value={`${avgKcal.toLocaleString('es-ES')}`}
          sub={kcalTarget ? `Obj: ${kcalTarget}` : undefined}
        />
        <StatBig
          label="Proteína media"
          value={`${avgProtein}g`}
          sub={proteinTarget ? `Obj: ${proteinTarget}g` : undefined}
        />
        <StatBig label="Días registrados" value={String(daily.length)} />
        {compliance !== null && (
          <StatBig label="Cumplimiento kcal" value={`${compliance}%`} sub="±15% del objetivo" />
        )}
      </div>

      {/* Kcal por día */}
      <ChartCard
        title="Calorías por día"
        footnote={kcalTarget ? `Línea punteada = objetivo ${kcalTarget} kcal` : undefined}
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradKcal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit=" kcal" width={60} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v) => [`${Number(v).toLocaleString('es-ES')} kcal`, 'Calorías']}
            />
            {kcalTarget && (
              <ReferenceLine
                y={kcalTarget}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `Obj ${kcalTarget}`,
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="kcal"
              name="Kcal"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gradKcal)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Macros por día — stacked bar */}
      <ChartCard title="Macros por día (g)" footnote="Proteína · Carbohidratos · Grasa">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={daily}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            barSize={daily.length > 30 ? 6 : 14}
          >
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="g" />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) => {
                const labels: Record<string, string> = {
                  proteinG: 'Proteína',
                  carbsG: 'Carbohidratos',
                  fatG: 'Grasa',
                }
                return [`${Number(v).toFixed(1)}g`, labels[String(name)] ?? String(name)]
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
              formatter={(v: string) =>
                (
                  ({ proteinG: 'Proteína', carbsG: 'Carbohidratos', fatG: 'Grasa' }) as Record<
                    string,
                    string
                  >
                )[v] ?? v
              }
            />
            <Bar
              dataKey="proteinG"
              name="proteinG"
              stackId="a"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
            />
            <Bar dataKey="carbsG" name="carbsG" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fatG" name="fatG" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Proteína y grasa por día — líneas individuales */}
      <ChartCard title="Proteína y grasa diaria (g)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="g" />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) => [`${Number(v).toFixed(1)}g`, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
            {proteinTarget && (
              <ReferenceLine
                y={proteinTarget}
                stroke="#22c55e"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `Obj ${proteinTarget}g`,
                  position: 'insideTopRight',
                  fill: '#22c55e',
                  fontSize: 10,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="proteinG"
              name="Proteína"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="fatG"
              name="Grasa"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Distribución media de macros (donut) */}
      {(avgProtein > 0 || avgCarbs > 0 || avgFat > 0) &&
        (() => {
          const totalG = avgProtein + avgCarbs + avgFat
          const slices = [
            { name: 'Proteína', value: avgProtein, color: '#22c55e' },
            { name: 'Carbohidratos', value: avgCarbs, color: '#38bdf8' },
            { name: 'Grasa', value: avgFat, color: '#f59e0b' },
          ]
          return (
            <ChartCard title="Distribución media de macros (registros reales)">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie
                        data={slices}
                        dataKey="value"
                        innerRadius={44}
                        outerRadius={66}
                        paddingAngle={3}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {slices.map((s, i) => (
                          <Cell key={s.name} fill={MACRO_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v, name) => [
                          `${Number(v).toFixed(1)}g (${totalG > 0 ? Math.round((Number(v) / totalG) * 100) : 0}%)`,
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {slices.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: s.color }}
                        />
                        <span className="text-foreground/70">{s.name}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="bg-line/20 h-2 w-24 rounded-full">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              background: s.color,
                              width: totalG > 0 ? `${Math.round((s.value / totalG) * 100)}%` : '0%',
                            }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-semibold">
                          {s.value}g · {totalG > 0 ? Math.round((s.value / totalG) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  <p className="text-foreground/40 mt-1 text-xs">
                    Media de {daily.length} días · {avgKcal.toLocaleString('es-ES')} kcal/día
                  </p>
                </div>
              </div>
            </ChartCard>
          )
        })()}
    </div>
  )
}

function SubtabNutricion({ overview }: { overview: Overview }) {
  const { nutritionPlans } = overview
  const [logs, setLogs] = useState<NutritionLogEntry[] | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(true)

  useEffect(() => {
    fetch(`/api/nutrition-logs?athleteId=${overview.id}&take=90`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items: NutritionLogEntry[] } | null) => {
        setLogs(d?.items ?? [])
        setLoadingLogs(false)
      })
      .catch(() => {
        setLogs([])
        setLoadingLogs(false)
      })
  }, [overview.id])

  const activePlan = nutritionPlans.find((p) => p.isActive) ?? nutritionPlans[0] ?? null
  const others = nutritionPlans.filter((p) => p.id !== activePlan?.id)

  return (
    <div className="space-y-4">
      {/* Gráficas de registros diarios */}
      {loadingLogs ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <NutritionLogCharts logs={logs ?? []} activePlan={activePlan} />
      )}

      {/* Plan nutricional asignado */}
      {activePlan ? (
        <>
          <div className="border-line/30 mt-2 border-t pt-4">
            <p className="text-foreground/35 mb-3 text-xs font-semibold tracking-widest uppercase">
              Plan nutricional asignado
            </p>
          </div>
          <NutritionPlanSummary plan={activePlan} />
          {others.map((p) => (
            <NutritionPlanSummary key={p.id} plan={p} />
          ))}
        </>
      ) : (
        <div className="border-line bg-surface text-foreground/40 rounded-2xl border border-dashed py-10 text-center text-sm">
          Sin plan nutricional asignado
        </div>
      )}
    </div>
  )
}

// ── EstadisticasTab principal ────────────────────────────────────────────────
function EstadisticasTab({ overview }: { overview: Overview }) {
  const [subtab, setSubtab] = useState<
    'composicion' | 'adherencia' | 'entrenamiento' | 'musculo' | 'nutricion'
  >('composicion')
  const [range, setRange] = useState<string>('90')

  const subtabs = [
    { key: 'composicion' as const, label: 'Composición' },
    { key: 'adherencia' as const, label: 'Adherencia' },
    { key: 'entrenamiento' as const, label: 'Entrenamiento' },
    { key: 'musculo' as const, label: 'Por músculo' },
    { key: 'nutricion' as const, label: 'Nutrición' },
  ]

  return (
    <div className="space-y-4">
      {/* Subtabs + selector de rango */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-surface-strong flex gap-1 rounded-xl p-1">
          {subtabs.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSubtab(st.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                subtab === st.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border-line bg-surface text-foreground focus:border-accent/50 rounded-xl border px-3 py-1.5 text-xs focus:outline-none"
          aria-label="Rango de tiempo"
        >
          <option value="7">7 días</option>
          <option value="30">30 días</option>
          <option value="90">90 días</option>
          <option value="all">Todo</option>
        </select>
      </div>

      {subtab === 'composicion' && <SubtabComposicion overview={overview} />}
      {subtab === 'adherencia' && <SubtabAdherencia overview={overview} />}
      {subtab === 'entrenamiento' && <SubtabEntrenamiento overview={overview} />}
      {subtab === 'musculo' && <SubtabMusculo athleteId={overview.id} range={range} />}
      {subtab === 'nutricion' && <SubtabNutricion overview={overview} />}
    </div>
  )
}

function ResumenTab({ overview }: { overview: Overview }) {
  const { stats, checkIns, recentSessions, plans } = overview
  const lastCI = checkIns[0] ?? null
  const activePlan = plans[0] ?? null
  const daysNoCI = daysDiff(stats.lastCheckInDate)

  return (
    <div className="space-y-6">
      {daysNoCI != null && daysNoCI > 7 && (
        <div className="border-warning/30 bg-warning/8 text-warning flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
          <span>⚠️</span>
          <span>
            Sin check-in hace <strong>{daysNoCI} días</strong>. Puede necesitar seguimiento.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBig label="Adherencia media" value={`${stats.avgAdherence ?? '—'}%`} />
        <StatBig label="Sesiones totales" value={String(stats.totalSessions)} />
        <StatBig label="Racha (semanas)" value={String(stats.streakWeeks)} />
        <StatBig label="Check-ins totales" value={String(stats.totalCheckIns)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {lastCI ? (
          <div className="border-line bg-surface rounded-2xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Último check-in</h3>
              <span className="text-foreground/40 text-xs">{lastCI.weekLabel ?? lastCI.date}</span>
            </div>
            <AdherenceBar pct={lastCI.adherencePct} />
            <div className="text-foreground/60 mt-2 grid grid-cols-3 gap-2 text-xs">
              <span>✓ {lastCI.adherencePct}%</span>
              <span>⚖️ {lastCI.weightKg} kg</span>
              <span>😴 {lastCI.sleepHours}h</span>
            </div>
            {lastCI.sensations && (
              <p className="border-line bg-surface-strong text-foreground/55 mt-3 rounded-xl border px-3 py-2 text-xs italic">
                &ldquo;{lastCI.sensations}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <EmptyCard text="Sin check-ins aún" />
        )}

        {activePlan ? (
          <div className="border-line bg-surface rounded-2xl border p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Plan activo</h3>
              <Link
                href={`/coach/plans/${activePlan.id}/print`}
                className="text-accent text-xs hover:underline"
              >
                Imprimir
              </Link>
            </div>
            <p className="font-medium">{activePlan.title}</p>
            <p className="text-foreground/50 text-xs">
              {activePlan.weeksCount} semanas · {activePlan.sessionsCount} sesiones
            </p>
          </div>
        ) : (
          <EmptyCard text="Sin plan asignado" />
        )}
      </div>

      {recentSessions.length > 0 && (
        <div>
          <h3 className="text-foreground/70 mb-3 font-semibold">Sesiones recientes</h3>
          <div className="max-h-75 space-y-2 overflow-y-auto pr-1">
            {recentSessions.slice(0, 12).map((s) => (
              <div
                key={s.id}
                className="border-line bg-surface flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{s.sessionName}</p>
                  <p className="text-foreground/40 text-xs">{s.date}</p>
                </div>
                <div className="text-foreground/50 flex gap-3 text-xs">
                  {s.durationMin && <span>{s.durationMin} min</span>}
                  {s.kcalBurned && <span>{s.kcalBurned} kcal</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckInsTab({
  athleteId: _athleteId,
  overview,
}: {
  athleteId: string
  overview: Overview
}) {
  const { checkIns } = overview
  const [editingId, setEditingId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(checkIns.map((c) => [c.id, c.coachNote ?? '']))
  )

  async function saveNote(ciId: string) {
    setSaving(true)
    try {
      const r = await fetch(`/api/check-ins/${ciId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachNote: noteText }),
      })
      if (r.ok) {
        setNotes((prev) => ({ ...prev, [ciId]: noteText }))
        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground/70 font-semibold">Historial de check-ins</h3>
        <span className="text-foreground/40 text-xs">{checkIns.length} registros</span>
      </div>

      {checkIns.length === 0 ? (
        <EmptyCard text="Sin check-ins registrados" tall />
      ) : (
        <div className="max-h-170 space-y-3 overflow-y-auto pr-1">
          {checkIns.map((ci) => {
            const adhClass =
              ci.adherencePct >= 80
                ? 'text-success'
                : ci.adherencePct >= 60
                  ? 'text-warning'
                  : 'text-danger'
            const isEditing = editingId === ci.id
            const savedNote = notes[ci.id] ?? ''
            return (
              <div key={ci.id} className="border-line bg-surface rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{ci.weekLabel ?? ci.date}</p>
                    <p className="text-foreground/40 text-xs">{ci.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${adhClass}`}>{ci.adherencePct}%</span>
                </div>
                <AdherenceBar pct={ci.adherencePct} />
                <div className="text-foreground/55 mt-2 flex flex-wrap gap-3 text-xs">
                  <span>⚖️ {ci.weightKg} kg</span>
                  <span>😴 {ci.sleepHours}h</span>
                  {ci.stepsAvg > 0 && <span>👟 {ci.stepsAvg.toLocaleString('es-ES')}</span>}
                </div>
                {ci.sensations && (
                  <p className="border-line bg-surface-strong text-foreground/50 mt-2 rounded-xl border px-3 py-2 text-xs italic">
                    &ldquo;{ci.sensations}&rdquo;
                  </p>
                )}

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="border-line bg-background focus:border-accent w-full resize-none rounded-xl border px-3 py-2 text-xs outline-none"
                      rows={2}
                      placeholder="Nota del coach..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void saveNote(ci.id)}
                        disabled={saving}
                        className="bg-accent rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {saving ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="border-line text-foreground/50 hover:text-foreground rounded-full border px-3 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    {savedNote && (
                      <div className="border-accent/20 bg-accent/5 rounded-xl border px-3 py-2">
                        <p className="text-accent/70 text-xs font-semibold">Nota coach</p>
                        <p className="text-foreground/65 text-xs">{savedNote}</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setEditingId(ci.id)
                        setNoteText(savedNote)
                      }}
                      className="text-accent/60 hover:text-accent text-xs transition"
                    >
                      {savedNote ? 'Editar nota' : '+ Añadir nota'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrainingTab({ overview }: { overview: Overview }) {
  const { plans } = overview
  const [expanded, setExpanded] = useState<string | null>(plans[0]?.id ?? null)

  return (
    <div className="space-y-4">
      <h3 className="text-foreground/70 font-semibold">Planes de entrenamiento</h3>
      {plans.length === 0 ? (
        <EmptyCard text="Sin planes asignados" tall />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border-line bg-surface overflow-hidden rounded-2xl border"
            >
              <button
                onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                className="hover:bg-surface-strong flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition"
              >
                <div>
                  <p className="font-semibold">{plan.title}</p>
                  <p className="text-foreground/40 text-xs">
                    {plan.weeksCount} semanas · {plan.sessionsCount} sesiones
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/coach/plans/${plan.id}/print`}
                    onClick={(e) => e.stopPropagation()}
                    className="border-line hover:border-accent/40 hover:text-accent rounded-full border px-3 py-1 text-xs transition"
                  >
                    Imprimir
                  </Link>
                  <span className="text-foreground/30 text-sm">
                    {expanded === plan.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              {expanded === plan.id && (
                <div className="border-line text-foreground/60 border-t px-5 py-4 text-sm">
                  {plan.sessionsCount} sesiones · creado {plan.createdAt}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Health Connections Tab ───────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  APPLE_HEALTH: 'Apple Health',
  HEALTH_CONNECT: 'Health Connect',
  GARMIN: 'Garmin',
  POLAR: 'Polar',
  FITBIT: 'Fitbit',
  WHOOP: 'WHOOP',
  MANUAL: 'Manual',
}

const PROVIDER_ICONS: Record<string, string> = {
  APPLE_HEALTH: '🍎',
  HEALTH_CONNECT: '💚',
  GARMIN: '⌚',
  POLAR: '🔴',
  FITBIT: '📊',
  WHOOP: '⚡',
  MANUAL: '📝',
}

type HealthConn = {
  id: string
  provider: string
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

function HealthConnectionsTab({ athleteId }: { athleteId: string }) {
  const [connections, setConnections] = useState<HealthConn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/athletes/${athleteId}/health-connections`)
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d: { connections: HealthConn[] }) => setConnections(d.connections ?? []))
      .catch(() => void 0)
      .finally(() => setLoading(false))
  }, [athleteId])

  if (loading) return <Skeleton className="h-40 rounded-2xl" />

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Conexiones de salud</h3>
      {connections.length === 0 ? (
        <EmptyCard text="Sin conexiones configuradas" tall />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border p-4 ${c.isActive ? 'border-success/40 bg-success/5' : 'border-line bg-surface opacity-60'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{PROVIDER_ICONS[c.provider] ?? '🔗'}</span>
                <div>
                  <p className="text-sm font-semibold">
                    {PROVIDER_LABELS[c.provider] ?? c.provider}
                  </p>
                  <p className="text-foreground/50 text-xs">
                    {c.isActive ? 'Activa' : 'Inactiva'}
                    {c.lastSyncAt
                      ? ` · Sync ${new Date(c.lastSyncAt).toLocaleDateString('es-ES')}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-foreground/40 text-xs">
        El atleta gestiona sus conexiones desde su perfil de atleta.
      </p>
    </div>
  )
}

// ─── Consent Tab ──────────────────────────────────────────────────────────────

type ConsentRecord = {
  id: string
  version: string
  acceptedAt: string
  signatureRef: string | null
  isValid: boolean
  revokedAt: string | null
}

function ConsentTab({ athleteId }: { athleteId: string }) {
  const [consent, setConsent] = useState<ConsentRecord | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/athletes/${athleteId}/consent`)
      .then((r) => (r.ok ? r.json() : { consent: null }))
      .then((d: { consent: ConsentRecord | null }) => setConsent(d.consent))
      .catch(() => setConsent(null))
      .finally(() => setLoading(false))
  }, [athleteId])

  if (loading) return <Skeleton className="h-40 rounded-2xl" />

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Estado del contrato</h3>
      {consent == null ? (
        <div className="border-warning/40 bg-warning/8 rounded-2xl border p-5 text-sm">
          <p className="text-warning font-semibold">⚠️ Contrato no aceptado</p>
          <p className="text-foreground/60 mt-1">
            El atleta aún no ha firmado el contrato de coaching. Se solicitará durante el
            onboarding.
          </p>
        </div>
      ) : (
        <div className="border-success/40 bg-success/5 space-y-3 rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <span className="text-success text-xl">✓</span>
            <div>
              <p className="font-semibold">Contrato aceptado</p>
              <p className="text-foreground/50 text-xs">
                Versión {consent.version} · {new Date(consent.acceptedAt).toLocaleString('es-ES')}
              </p>
            </div>
          </div>
          {consent.signatureRef && (
            <div className="border-line bg-surface-strong rounded-xl border px-4 py-2 text-sm">
              <span className="text-foreground/50">Firma: </span>
              <span className="font-medium italic">{consent.signatureRef}</span>
            </div>
          )}
          {!consent.isValid && consent.revokedAt && (
            <p className="text-danger text-xs">
              Revocado el {new Date(consent.revokedAt).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AthleteDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const athleteId = params.id as string

  const rawTab = searchParams.get('tab') ?? 'resumen'
  const activeTab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'resumen'

  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [asideOpen, setAsideOpen] = useState(true)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const r = await fetch(`/api/athletes/${athleteId}/overview`)
      if (!r.ok) {
        setError(true)
        return
      }
      setOverview((await r.json()) as Overview)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  function setTab(key: string) {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('tab', key)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-6 py-8 md:px-10 lg:px-12">
        <div className="hidden w-85 shrink-0 space-y-3 xl:block">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-64 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-semibold">No se pudo cargar el atleta</p>
        <button
          onClick={() => void loadOverview()}
          className="bg-accent hover:bg-accent-strong rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const tabsWithBadges = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    badge:
      t.key === 'checkins'
        ? overview.stats.totalCheckIns
        : t.key === 'documentos'
          ? overview.documents.length
          : undefined,
  }))

  const aside = asideOpen ? (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href="/coach/athletes"
          className="text-foreground/40 hover:text-foreground flex items-center gap-1.5 text-xs transition"
        >
          ← Todos los atletas
        </Link>
        <button
          onClick={() => setAsideOpen(false)}
          className="text-foreground/30 hover:bg-surface-strong hover:text-foreground rounded-lg p-1 transition"
          aria-label="Colapsar panel lateral"
          title="Colapsar"
        >
          ‹
        </button>
      </div>
      <AsideContent tab={activeTab} overview={overview} athleteId={athleteId} />
    </div>
  ) : null

  const main = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{overview.fullName}</h1>
          <p className={`text-sm font-medium ${GOAL_TONE[overview.goal] ?? 'text-foreground/50'}`}>
            {GOAL_LABEL[overview.goal] ?? overview.goal} · {overview.phaseLabel}
          </p>
        </div>
        {!asideOpen && (
          <button
            onClick={() => setAsideOpen(true)}
            className="border-line text-foreground/40 hover:bg-surface-strong hover:text-foreground hidden shrink-0 rounded-lg border p-1.5 transition xl:flex"
            aria-label="Mostrar panel lateral"
            title="Mostrar panel lateral"
          >
            ›
          </button>
        )}
      </div>

      <TabsBar
        tabs={tabsWithBadges}
        active={activeTab}
        onChange={setTab}
        className="bg-background/95 sticky top-16 z-10 -mx-1 px-1 py-2 backdrop-blur-sm"
      />

      <div className="min-h-[400px]">
        {activeTab === 'resumen' && <ResumenTab overview={overview} />}
        {activeTab === 'estadisticas' && <EstadisticasTab overview={overview} />}
        {activeTab === 'checkins' && <CheckInsTab athleteId={athleteId} overview={overview} />}
        {activeTab === 'entrenamiento' && <TrainingTab overview={overview} />}
        {activeTab === 'contexto' && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <AthleteContextPanel athleteId={athleteId} />
          </Suspense>
        )}
        {activeTab === 'nutricion' && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <NutritionComplianceTab athleteId={athleteId} />
          </Suspense>
        )}
        {activeTab === 'documentos' && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <DocumentPanel athleteId={athleteId} />
          </Suspense>
        )}
        {activeTab === 'fotos' && (
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <AthletePhotosTab athleteId={athleteId} />
          </Suspense>
        )}
        {activeTab === 'salud' && <HealthConnectionsTab athleteId={athleteId} />}
        {activeTab === 'contrato' && <ConsentTab athleteId={athleteId} />}
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-370 px-6 py-6 md:px-10 lg:px-12">
      <SplitLayout aside={aside} main={main} />
    </div>
  )
}

export default function AthleteDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-370 gap-6 px-6 py-8 md:px-10 lg:px-12">
          <Skeleton className="hidden h-64 w-[340px] shrink-0 rounded-2xl xl:block" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      }
    >
      <AthleteDetailContent />
    </Suspense>
  )
}
