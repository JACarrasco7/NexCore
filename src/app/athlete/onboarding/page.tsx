"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { SectionIntro } from "@/components/section-intro";
import { useAthletes } from "@/lib/store";
import { useCoachMe } from "@/lib/use-coach-me";

type Goal = string;

type CatalogGoal = {
  id: string | null;
  code: string;
  label: string;
  description: string | null | undefined;
  isVisible: boolean;
  isDefault?: boolean;
};

type CatalogPhase = {
  id: string;
  code: string;
  label: string;
};

type FormData = {
  fullName: string;
  phone: string;
  contactEmail: string;
  primaryComment: string;
  goal: Goal;
  phaseLabel: string;
  coachId: string;
  teamId: string | null;
  healthConnections: string[];
};

type TeamCoach = {
  coachId: string;
  displayName: string;
  email: string;
  phone: string | null;
  role: string;
};

const FALLBACK_GOALS: CatalogGoal[] = [
  { id: null, code: "VOLUMEN", label: "Volumen", description: "Construir masa muscular con superávit controlado.", isVisible: true, isDefault: true },
  { id: null, code: "DEFINICION", label: "Definición", description: "Reducir grasa preservando músculo en déficit.", isVisible: true, isDefault: true },
  { id: null, code: "MANTENIMIENTO", label: "Mantenimiento", description: "Mantener composición corporal actual.", isVisible: true, isDefault: true },
  { id: null, code: "PEAK_WEEK", label: "Peak Week", description: "Puesta a punto previa a competición.", isVisible: true, isDefault: true },
];

const STEPS = ["Datos personales y objetivo", "Contrato legal", "Confirmación"];

const EMPTY_FORM: FormData = {
  fullName: "",
  phone: "",
  contactEmail: "",
  primaryComment: "",
  goal: "VOLUMEN",
  phaseLabel: "",
  coachId: "",
  teamId: null,
  healthConnections: [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const { coach, loading: loadingCoach } = useCoachMe();
  const { addAthlete } = useAthletes(coach?.id);
  const formId = useId();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([]);
  const [catalogGoals, setCatalogGoals] = useState<CatalogGoal[]>(FALLBACK_GOALS);
  const [catalogPhases, setCatalogPhases] = useState<CatalogPhase[]>([]);
  const [phaseMode, setPhaseMode] = useState<"catalog" | "custom">("catalog");
  const [contractTemplate, setContractTemplate] = useState<string>("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentSignature, setConsentSignature] = useState("");

  useEffect(() => {
    if (!coach?.id) return;
    Promise.all([
      fetch("/api/teams/coaches").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/teams/catalog").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/teams/contract").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([coachesData, catalogData, contractData]: [{ teamId: string | null; coaches: TeamCoach[] } | null, { goals: CatalogGoal[]; phases: CatalogPhase[] } | null, { template: string } | null]) => {
        if (coachesData) {
          setTeamCoaches(coachesData.coaches ?? []);
          setForm((prev) => ({
            ...prev,
            teamId: coachesData.teamId,
            coachId: prev.coachId || (coachesData.coaches.find((c) => c.coachId === coach.id)?.coachId ?? coachesData.coaches[0]?.coachId ?? ""),
          }));
        }
        if (catalogData) {
          const visibleGoals = (catalogData.goals ?? []).filter((g) => g.isVisible !== false);
          if (visibleGoals.length > 0) setCatalogGoals(visibleGoals);
          if ((catalogData.phases ?? []).length > 0) {
            setCatalogPhases(catalogData.phases);
            setPhaseMode("catalog");
          }
        }
        if (contractData?.template) setContractTemplate(contractData.template);
      })
      .catch(() => void 0);
  }, [coach?.id]);

  const selectedCoach = useMemo(
    () => teamCoaches.find((c) => c.coachId === form.coachId) ?? null,
    [teamCoaches, form.coachId],
  );

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const goalApiValue = form.goal.toLowerCase().replace("_", "-");
    const created = await addAthlete({
      fullName: form.fullName,
      goal: goalApiValue as "volumen" | "definicion" | "mantenimiento" | "peak-week",
      phaseLabel: form.phaseLabel || "Semana 1",
      coachName: selectedCoach?.displayName ?? coach?.displayName ?? "Coach",
      coachUserId: null,
      userId: null,
      phone: form.phone || null,
      contactEmail: form.contactEmail || null,
      primaryComment: form.primaryComment || null,
      teamId: form.teamId,
      healthConnections: [],
      coachId: form.coachId || coach?.id,
    });

    if (consentAccepted && created?.id) {
      await fetch(`/api/athletes/${created.id}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureRef: consentSignature.trim() || null }),
      }).catch(() => void 0);
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-4xl text-white">✓</div>
        <div>
          <h1 className="text-3xl font-semibold">Alta completada</h1>
          <p className="mt-3 text-foreground/70">
            <strong>{form.fullName}</strong> dado de alta — objetivo:{" "}
            <strong>{form.goal}</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/coach/athletes")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Ver atletas
          </button>
          <button
            onClick={() => {
              setSubmitted(false);
              setStep(0);
              setForm({
                ...EMPTY_FORM,
                coachId: teamCoaches[0]?.coachId ?? "",
                teamId: form.teamId,
              });
            }}
            className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:bg-surface-strong"
          >
            Dar de alta otro
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Onboarding del atleta"
        title="Alta operativa sin formularios dispersos"
        description={loadingCoach ? "Cargando perfil coach..." : coach ? `Equipo de ${coach.displayName}` : "Rellena los datos una sola vez. Sin PDFs, sin WhatsApp, sin carpetas."}
      />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                i < step
                  ? "bg-accent text-white"
                  : i === step
                    ? "border-2 border-accent text-accent"
                    : "border border-line text-foreground/40"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`hidden text-xs md:block ${i === step ? "font-medium text-accent" : "text-foreground/50"}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-4xl border border-line bg-surface p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Datos personales y objetivo</h2>
            <div className="space-y-1">
              <label htmlFor={`${formId}-name`} className="text-sm font-medium text-foreground/70">
                Nombre completo
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Ej: Carlos Ruiz"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-email`} className="text-sm font-medium text-foreground/70">
                Email del atleta
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                placeholder="Ej: atleta@email.com"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-phone`} className="text-sm font-medium text-foreground/70">
                Telefono del atleta
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Ej: +34 600 000 000"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-coach-select`} className="text-sm font-medium text-foreground/70">
                Coach del equipo
              </label>
              <select
                id={`${formId}-coach-select`}
                value={form.coachId}
                onChange={(e) => update("coachId", e.target.value)}
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              >
                {teamCoaches.length === 0 ? (
                  <option value="">Sin coaches en el equipo</option>
                ) : (
                  teamCoaches.map((c) => (
                    <option key={c.coachId} value={c.coachId}>
                      {c.displayName} · {c.email} · {c.phone || "sin telefono"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {catalogGoals.map((g) => (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => update("goal", g.code)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    form.goal === g.code
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface-strong hover:border-accent/50"
                  }`}
                >
                  <p className="text-sm font-semibold">{g.label}</p>
                  {g.description ? <p className="mt-1 text-xs text-foreground/60">{g.description}</p> : null}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor={`${formId}-phase`} className="text-sm font-medium text-foreground/70">
                  Fase / etiqueta de semana
                </label>
                {catalogPhases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhaseMode((m) => m === "catalog" ? "custom" : "catalog");
                      update("phaseLabel", "");
                    }}
                    className="text-xs text-accent hover:underline"
                  >
                    {phaseMode === "catalog" ? "Escribir personalizada" : "Usar catálogo"}
                  </button>
                )}
              </div>
              {catalogPhases.length > 0 && phaseMode === "catalog" ? (
                <select
                  id={`${formId}-phase`}
                  value={form.phaseLabel}
                  onChange={(e) => update("phaseLabel", e.target.value)}
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                >
                  <option value="">Seleccionar fase del equipo…</option>
                  {catalogPhases.map((p) => (
                    <option key={p.id} value={p.label}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${formId}-phase`}
                  type="text"
                  value={form.phaseLabel}
                  onChange={(e) => update("phaseLabel", e.target.value)}
                  placeholder="Ej: Semana 3 Bloque A"
                  className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
                />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-comment`} className="text-sm font-medium text-foreground/70">
                Comentario primario
              </label>
              <textarea
                id={`${formId}-comment`}
                value={form.primaryComment}
                onChange={(e) => update("primaryComment", e.target.value)}
                placeholder="Contexto inicial del atleta, observaciones del coach, etc."
                rows={3}
                className="w-full resize-none rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Contrato legal</h2>
            <p className="text-sm text-foreground/60">
              El atleta debe leer y aceptar los términos antes de finalizar el alta.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface-strong p-4 text-sm text-foreground/80 whitespace-pre-wrap">
              {contractTemplate || "Cargando contrato…"}
            </div>
            <div className="space-y-3 rounded-2xl border border-line bg-surface-strong p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-accent"
                />
                <span className="text-sm">
                  He leído y acepto los términos del contrato de coaching.
                </span>
              </label>
              {consentAccepted && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground/60">
                    Firma (nombre completo del atleta)
                  </label>
                  <input
                    type="text"
                    value={consentSignature}
                    onChange={(e) => setConsentSignature(e.target.value)}
                    placeholder="Escribe tu nombre completo"
                    className="w-full rounded-xl border border-line bg-surface px-4 py-2 text-sm outline-none transition focus:border-accent"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Confirmacion</h2>
            <ul className="space-y-3 text-sm">
              {(
                [
                  ["Nombre", form.fullName],
                  ["Email atleta", form.contactEmail || "No indicado"],
                  ["Telefono atleta", form.phone || "No indicado"],
                  ["Coach", selectedCoach ? `${selectedCoach.displayName} (${selectedCoach.email})` : "No seleccionado"],
                  ["Objetivo", form.goal],
                  ["Fase", form.phaseLabel || "Semana 1"],
                  ["Contrato aceptado", consentAccepted ? `Sí — "${consentSignature || "Sin firma tipada"}"` : "No aceptado"],
                ] as [string, string][]
              ).map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface-strong px-4 py-3"
                >
                  <span className="text-foreground/60">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
        >
          Anterior
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && (!form.fullName.trim() || !form.coachId)) ||
              (step === 1 && !consentAccepted)
            }
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Completar alta
          </button>
        )}
      </div>
    </main>
  );
}
