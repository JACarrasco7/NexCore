"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AthleteContextProfileData } from "@/lib/athlete-context";
import { DEFAULT_ATHLETE_CONTEXT } from "@/lib/athlete-context";

type OverviewLite = {
  fullName: string;
  goal: string;
  phaseLabel: string;
};

export default function AthleteContextPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [overview, setOverview] = useState<OverviewLite | null>(null);
  const [contextData, setContextData] = useState<AthleteContextProfileData>(DEFAULT_ATHLETE_CONTEXT);
  const [loading, setLoading] = useState(true);

  const sortedMachines = contextData.gymMachines
    .slice()
    .sort((a, b) => {
      const groupCmp = (a.muscleGroup ?? "Otro").localeCompare(b.muscleGroup ?? "Otro", "es", { sensitivity: "base" });
      if (groupCmp !== 0) return groupCmp;
      return (a.name ?? "").localeCompare(b.name ?? "", "es", { sensitivity: "base" });
    });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/api/athletes/${id}/overview`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/athletes/${id}/context`).then((r) => (r.ok ? r.json() : DEFAULT_ATHLETE_CONTEXT)),
    ])
      .then(([ov, ctx]) => {
        if (cancelled) return;
        setOverview(ov);
        setContextData({ ...DEFAULT_ATHLETE_CONTEXT, ...ctx });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className="mx-auto max-w-[1480px] p-8 text-sm text-foreground/50">Cargando reporte…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] space-y-6 px-6 py-8 md:px-10 print:max-w-none print:px-0 print:py-0">
      <div className="no-print flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-4">
        <Link
          href={`/coach/athletes/${id}`}
          className="rounded-full border border-line px-4 py-2 text-sm text-foreground/60 transition hover:text-foreground"
        >
          ← Volver
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <section className="rounded-4xl border border-line bg-surface p-6">
        <p className="text-xs uppercase tracking-widest text-foreground/40">Reporte de contexto del atleta</p>
        <h1 className="mt-1 text-2xl font-bold">{overview?.fullName ?? "Atleta"}</h1>
        <p className="mt-1 text-sm text-foreground/55">Objetivo: {overview?.goal ?? "—"} · Fase: {overview?.phaseLabel ?? "—"}</p>
      </section>

      <section className="rounded-4xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Movilidad / Postura</h2>
        <div className="overflow-auto rounded-3xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-strong text-xs text-foreground/55">
              <tr>
                <th className="px-3 py-2 text-left">Test</th>
                <th className="px-3 py-2 text-left">Hallazgo</th>
                <th className="px-3 py-2 text-left">Implicación</th>
                <th className="px-3 py-2 text-left">Severidad</th>
              </tr>
            </thead>
            <tbody>
              {contextData.mobilityTests.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-3 py-2">{t.test || "—"}</td>
                  <td className="px-3 py-2">{t.finding || "—"}</td>
                  <td className="px-3 py-2">{t.implication || "—"}</td>
                  <td className="px-3 py-2 uppercase">{t.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-lg font-semibold">Alimentos no pautables</h2>
          <ul className="space-y-2 text-sm">
            {contextData.restrictedFoods.length === 0 && <li className="text-foreground/45">Sin datos.</li>}
            {contextData.restrictedFoods.map((f) => (
              <li key={f.id} className="rounded-2xl border border-line bg-surface-strong px-3 py-2">
                <span className="font-semibold">{f.name || "—"}</span>
                <span className="text-foreground/55"> · {f.reason || "Sin motivo"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-lg font-semibold">Ejercicios no pautables</h2>
          <ul className="space-y-2 text-sm">
            {contextData.restrictedExercises.length === 0 && <li className="text-foreground/45">Sin datos.</li>}
            {contextData.restrictedExercises.map((e) => (
              <li key={e.id} className="rounded-2xl border border-line bg-surface-strong px-3 py-2">
                <span className="font-semibold">{e.name || "—"}</span>
                <span className="text-foreground/55"> · {e.reason || "Sin motivo"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-4xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Maquinaria disponible del gym</h2>
        <ul className="space-y-2 text-sm">
          {sortedMachines.length === 0 && <li className="text-foreground/45">Sin datos.</li>}
          {sortedMachines.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface-strong px-3 py-2">
              <span className="font-semibold">{m.name || "—"}</span>
              {m.brand ? <span className="text-foreground/55"> · Marca: {m.brand}</span> : null}
              {m.model ? <span className="text-foreground/55"> · Modelo: {m.model}</span> : null}
              {m.muscleGroup ? <span className="text-foreground/55"> · Grupo: {m.muscleGroup}</span> : null}
              {m.note ? <span className="text-foreground/55"> · {m.note}</span> : null}
              {m.imageUrl ? <span className="text-foreground/55"> · imagen: sí</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-4xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-lg font-semibold">Musculatura objetivo y volumen</h2>
        <div className="overflow-auto rounded-3xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-strong text-xs text-foreground/55">
              <tr>
                <th className="px-3 py-2 text-left">Músculo</th>
                <th className="px-3 py-2 text-left">Prioridad</th>
                <th className="px-3 py-2 text-left">Volumen ideal</th>
                <th className="px-3 py-2 text-left">Volumen máximo</th>
              </tr>
            </thead>
            <tbody>
              {contextData.objectiveMuscles.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-3 py-2">{m.muscle || "—"}</td>
                  <td className="px-3 py-2 capitalize">{m.priority}</td>
                  <td className="px-3 py-2">{m.idealVolume || "—"}</td>
                  <td className="px-3 py-2">{m.maxVolume || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {contextData.notes && (
        <section className="rounded-4xl border border-line bg-surface p-6">
          <h2 className="mb-2 text-lg font-semibold">Notas del coach</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground/75">{contextData.notes}</p>
        </section>
      )}
    </main>
  );
}
