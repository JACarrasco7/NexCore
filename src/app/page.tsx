import Link from 'next/link'

import { StatCard } from '@/components/stat-card'
import { homePillars, roadmapItems, summaryStats } from '@/lib/mock-data'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-10 px-6 py-8 md:px-10 lg:px-12">
      <section className="border-line bg-surface rounded-4xl border p-8 shadow-[0_24px_80px_var(--accent-glow)] backdrop-blur md:p-10">
        <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="border-accent/25 bg-accent-soft text-accent inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
              ⚡ CARRIX Techboutique · coaches premium
            </span>
            <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-6xl">
              Todo el flujo{' '}
              <span className="from-accent to-accent-strong bg-linear-to-r bg-clip-text text-transparent">
                coach‑atleta
              </span>{' '}
              en una sola capa.
            </h1>
            <p className="text-foreground/70 max-w-2xl text-base leading-8 md:text-lg">
              NEXUM sustituye Drive, Excel y WhatsApp con rutina viva, nutrición, check-in y
              dashboard de priorización para equipos de alto nivel.
            </p>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-75 lg:grid-cols-1">
            <Link
              href="/coach"
              className="from-accent to-accent-strong rounded-2xl bg-linear-to-r px-5 py-4 text-center text-sm font-bold text-white shadow-[0_4px_20px_var(--accent-glow)] transition hover:opacity-90 hover:shadow-[0_6px_28px_var(--accent-glow)]"
            >
              ⚡ Dashboard coach
            </Link>
            <Link
              href="/athlete/training-log"
              className="border-accent/25 bg-accent-soft text-accent hover:bg-accent/15 rounded-2xl border px-5 py-4 text-center text-sm font-semibold transition"
            >
              🏋️ Rutina viva
            </Link>
            <Link
              href="/athlete/nutrition"
              className="border-line bg-surface-strong hover:border-accent/40 hover:text-accent rounded-2xl border px-5 py-4 text-center text-sm font-semibold transition"
            >
              🥗 Plan nutricional
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="border-line bg-surface-strong rounded-3xl border p-6">
            <div className="text-foreground/45 mb-5 flex items-center justify-between text-xs font-medium tracking-wider uppercase">
              <span>Estado operativo</span>
              <span className="border-line rounded-full border px-2.5 py-1">Semana 18</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {summaryStats.map((stat) => (
                <div key={stat.label} className="bg-background/50 rounded-2xl p-1">
                  <StatCard stat={stat} />
                </div>
              ))}
            </div>
          </div>

          <div className="border-accent/30 from-accent to-accent-strong rounded-3xl border bg-linear-to-br p-6 text-white shadow-[0_8px_32px_var(--accent-glow)]">
            <p className="text-accent-strong/70 text-xs font-bold tracking-[0.2em] uppercase opacity-80">
              Hoja de ruta
            </p>
            <ul className="mt-5 space-y-2.5 text-sm leading-6">
              {roadmapItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/8 px-4 py-2.5"
                >
                  <span className="text-accent-strong mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {homePillars.map((pillar) => (
          <Link
            key={pillar.label}
            href={pillar.href}
            className="group border-line bg-surface hover:border-accent/40 rounded-4xl border p-6 transition-all hover:-translate-y-1.5 hover:shadow-[0_18px_40px_var(--accent-glow)]"
          >
            <p className="text-accent/70 text-xs font-bold tracking-widest uppercase">
              Módulo clave
            </p>
            <h2 className="mt-4 text-2xl font-bold">{pillar.label}</h2>
            <p className="text-foreground/65 mt-3 text-sm leading-7">{pillar.description}</p>
            <span className="text-foreground/50 group-hover:text-accent mt-6 inline-flex items-center gap-1 text-sm font-semibold transition">
              Entrar <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
