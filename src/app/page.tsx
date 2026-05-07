import Link from "next/link";

import { StatCard } from "@/components/stat-card";
import { homePillars, roadmapItems, summaryStats } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-10 px-6 py-8 md:px-10 lg:px-12">
      <section className="rounded-4xl border border-line bg-surface p-8 shadow-[0_24px_80px_var(--accent-glow)] backdrop-blur md:p-10">
        <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              ⚡ MVP boutique · coaches premium
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Todo el flujo{" "}
              <span className="bg-linear-to-r from-accent to-accent-strong bg-clip-text text-transparent">
                coach‑atleta
              </span>{" "}
              en una sola capa.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-foreground/70 md:text-lg">
              Apex Coach OS sustituye Drive, Excel y WhatsApp con rutina viva,
              nutrición, check-in y dashboard de priorización para equipos de alto nivel.
            </p>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-75 lg:grid-cols-1">
            <Link
              href="/coach"
              className="rounded-2xl bg-linear-to-r from-accent to-accent-strong px-5 py-4 text-center text-sm font-bold text-white shadow-[0_4px_20px_var(--accent-glow)] transition hover:opacity-90 hover:shadow-[0_6px_28px_var(--accent-glow)]"
            >
              ⚡ Dashboard coach
            </Link>
            <Link
              href="/athlete/training-log"
              className="rounded-2xl border border-accent/25 bg-accent-soft px-5 py-4 text-center text-sm font-semibold text-accent transition hover:bg-accent/15"
            >
              🏋️ Rutina viva
            </Link>
            <Link
              href="/athlete/nutrition"
              className="rounded-2xl border border-line bg-surface-strong px-5 py-4 text-center text-sm font-semibold transition hover:border-accent/40 hover:text-accent"
            >
              🥗 Plan nutricional
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-line bg-surface-strong p-6">
            <div className="mb-5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-foreground/45">
              <span>Estado operativo</span>
              <span className="rounded-full border border-line px-2.5 py-1">Semana 18</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {summaryStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-background/50 p-1">
                  <StatCard stat={stat} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-accent/30 bg-linear-to-br from-accent to-accent-strong p-6 text-white shadow-[0_8px_32px_var(--accent-glow)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-strong/70 opacity-80">Hoja de ruta</p>
            <ul className="mt-5 space-y-2.5 text-sm leading-6">
              {roadmapItems.map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/8 px-4 py-2.5">
                  <span className="mt-0.5 text-accent-strong">✓</span>
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
            className="group rounded-4xl border border-line bg-surface p-6 transition-all hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-[0_18px_40px_var(--accent-glow)]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-accent/70">Módulo clave</p>
            <h2 className="mt-4 text-2xl font-bold">{pillar.label}</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/65">{pillar.description}</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-foreground/50 transition group-hover:text-accent">
              Entrar <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
