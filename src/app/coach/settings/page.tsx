"use client";

import { useEffect, useId, useState } from "react";
import { SectionIntro } from "@/components/section-intro";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogGoal = {
  id: string | null;
  code: string;
  label: string;
  description: string | null;
  isVisible: boolean;
  order: number;
  isDefault?: boolean;
};

type CatalogPhase = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isVisible: boolean;
  order: number;
};

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onToggle,
  onEdit,
}: {
  goal: CatalogGoal;
  onToggle: () => void;
  onEdit: (label: string, description: string) => void;
}) {
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(goal.label);
  const [desc, setDesc] = useState(goal.description ?? "");

  function save() {
    if (!label.trim()) return;
    onEdit(label.trim(), desc.trim());
    setEditing(false);
  }

  return (
    <div
      className={`rounded-3xl border p-5 transition ${goal.isVisible ? "border-line bg-surface-strong" : "border-line/40 bg-surface opacity-60"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{goal.label}</p>
          <p className="text-xs text-foreground/50">{goal.code}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:border-accent/40"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${goal.isVisible ? "bg-surface-strong text-foreground/70 hover:bg-danger/10 hover:text-danger" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"}`}
          >
            {goal.isVisible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <input
            id={`${formId}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Etiqueta del objetivo"
            className="w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            id={`${formId}-desc`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setLabel(goal.label);
                setDesc(goal.description ?? "");
                setEditing(false);
              }}
              className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-strong"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        goal.description && <p className="text-xs text-foreground/60">{goal.description}</p>
      )}
    </div>
  );
}

// ─── Phase Row ────────────────────────────────────────────────────────────────

function PhaseRow({
  phase,
  onDelete,
  onEdit,
}: {
  phase: CatalogPhase;
  onDelete: () => void;
  onEdit: (label: string) => void;
}) {
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(phase.label);

  function save() {
    if (!label.trim()) return;
    onEdit(label.trim());
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-strong px-4 py-3">
      {editing ? (
        <>
          <input
            id={`${formId}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
            autoFocus
          />
          <button type="button" onClick={save} className="text-xs font-semibold text-accent hover:underline">
            OK
          </button>
          <button type="button" onClick={() => { setLabel(phase.label); setEditing(false); }} className="text-xs text-foreground/50 hover:text-foreground">
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{phase.label}</span>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-foreground/50 hover:text-accent">
            Editar
          </button>
          <button type="button" onClick={onDelete} className="text-xs text-foreground/40 hover:text-danger">
            Eliminar
          </button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Team Settings (branding, locale, defaults, features) ───────────────────

type TeamSettingsData = {
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  locale: string;
  timezone: string;
  currency: string;
  supportEmail: string | null;
  legalEmail: string | null;
  websiteUrl: string | null;
  defaultCheckinDays: number;
  defaultReviewDays: number;
  features: Record<string, boolean> | null;
};

const DEFAULT_FEATURE_KEYS = [
  { key: "wall", label: "Muro del equipo" },
  { key: "healthConnections", label: "Conexiones de salud" },
  { key: "nutrition", label: "Nutrición" },
  { key: "documents", label: "Documentos" },
  { key: "photos", label: "Fotos de progreso" },
  { key: "contract", label: "Contrato legal" },
  { key: "emailVerification", label: "Verificación de email" },
];

function TeamSettingsEditor() {
  const [data, setData] = useState<TeamSettingsData>({
    displayName: null,
    logoUrl: null,
    primaryColor: null,
    accentColor: null,
    locale: "es-ES",
    timezone: "Europe/Madrid",
    currency: "EUR",
    supportEmail: null,
    legalEmail: null,
    websiteUrl: null,
    defaultCheckinDays: 7,
    defaultReviewDays: 7,
    features: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/teams/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { settings: Partial<TeamSettingsData> | null; features: Record<string, boolean> } | null) => {
        if (d?.settings) {
          setData((prev) => ({ ...prev, ...d.settings, features: d.features }));
        } else if (d?.features) {
          setData((prev) => ({ ...prev, features: d.features }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof TeamSettingsData>(k: K, v: TeamSettingsData[K]) {
    setData((p) => ({ ...p, [k]: v }));
  }

  function toggleFeature(key: string) {
    setData((p) => ({
      ...p,
      features: { ...(p.features ?? {}), [key]: !(p.features?.[key] ?? true) },
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/teams/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Configuración del equipo</h2>
          <p className="text-sm text-foreground/60">
            Identidad, localización, defaults operativos y módulos activos. Aplica a todo el tenant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
        >
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>

      {/* Identidad */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-2 text-sm font-semibold text-foreground/70">Identidad</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Nombre comercial</span>
            <input
              value={data.displayName ?? ""}
              onChange={(e) => update("displayName", e.target.value || null)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">URL del logo</span>
            <input
              value={data.logoUrl ?? ""}
              onChange={(e) => update("logoUrl", e.target.value || null)}
              placeholder="https://…"
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Color primario</span>
            <input
              type="color"
              value={data.primaryColor ?? "#6366f1"}
              onChange={(e) => update("primaryColor", e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface-strong px-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Color de acento</span>
            <input
              type="color"
              value={data.accentColor ?? "#8b5cf6"}
              onChange={(e) => update("accentColor", e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface-strong px-2"
            />
          </label>
        </div>
      </fieldset>

      {/* Localización */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-2 text-sm font-semibold text-foreground/70">Localización</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Locale</span>
            <input
              value={data.locale}
              onChange={(e) => update("locale", e.target.value)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Timezone</span>
            <input
              value={data.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Moneda</span>
            <input
              value={data.currency}
              onChange={(e) => update("currency", e.target.value)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
      </fieldset>

      {/* Contacto */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-2 text-sm font-semibold text-foreground/70">Contacto</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Email soporte</span>
            <input
              type="email"
              value={data.supportEmail ?? ""}
              onChange={(e) => update("supportEmail", e.target.value || null)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Email legal</span>
            <input
              type="email"
              value={data.legalEmail ?? ""}
              onChange={(e) => update("legalEmail", e.target.value || null)}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Sitio web</span>
            <input
              value={data.websiteUrl ?? ""}
              onChange={(e) => update("websiteUrl", e.target.value || null)}
              placeholder="https://…"
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
      </fieldset>

      {/* Defaults operativos */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-2 text-sm font-semibold text-foreground/70">Defaults operativos</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Cadencia check-in (días)</span>
            <input
              type="number"
              min={1}
              max={90}
              value={data.defaultCheckinDays}
              onChange={(e) => update("defaultCheckinDays", Number(e.target.value))}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Cadencia revisión plan (días)</span>
            <input
              type="number"
              min={1}
              max={90}
              value={data.defaultReviewDays}
              onChange={(e) => update("defaultReviewDays", Number(e.target.value))}
              className="rounded-xl border border-line bg-surface-strong px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
      </fieldset>

      {/* Módulos */}
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-2 text-sm font-semibold text-foreground/70">Módulos activos</legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {DEFAULT_FEATURE_KEYS.map((f) => {
            const enabled = data.features?.[f.key] ?? true;
            return (
              <label
                key={f.key}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-surface-strong px-4 py-3 text-sm"
              >
                <span>{f.label}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleFeature(f.key)}
                  className="h-5 w-5 accent-accent"
                />
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

// ─── Contract Editor ──────────────────────────────────────────────────────────

function ContractEditor() {
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/teams/contract")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { template: string } | null) => {
        if (d?.template) setTemplate(d.template);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/teams/contract", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contrato legal</h2>
          <p className="text-sm text-foreground/60">
            Texto que el atleta debe leer y aceptar durante el onboarding. Se guarda como snapshot en cada firma.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
        >
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar contrato"}
        </button>
      </div>
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
      ) : (
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={14}
          className="w-full resize-y rounded-2xl border border-line bg-surface-strong px-4 py-3 font-mono text-sm outline-none transition focus:border-accent"
          placeholder="Escribe aquí el texto del contrato en Markdown o texto plano…"
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoachSettingsPage() {
  const formId = useId();
  const [goals, setGoals] = useState<CatalogGoal[]>([]);
  const [phases, setPhases] = useState<CatalogPhase[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [newPhaseLabel, setNewPhaseLabel] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/teams/catalog/goals").then((r) => r.ok ? r.json() : null),
      fetch("/api/teams/catalog/phases").then((r) => r.ok ? r.json() : null),
    ])
      .then(([gData, pData]) => {
        if (gData) {
          setTeamId(gData.teamId);
          setGoals(gData.goals ?? []);
        }
        if (pData) setPhases(pData.phases ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateGoalLocal(code: string, update: Partial<CatalogGoal>) {
    setGoals((prev) => prev.map((g) => (g.code === code ? { ...g, ...update } : g)));
  }

  async function saveGoals() {
    setSavingGoals(true);
    setSaved(false);
    try {
      const res = await fetch("/api/teams/catalog/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals.map((g, i) => ({
          code: g.code,
          label: g.label,
          description: g.description,
          isVisible: g.isVisible,
          order: i,
        }))),
      });
      if (res.ok) {
        const data = await res.json() as { goals: CatalogGoal[] };
        setGoals(data.goals.map((g) => ({ ...g, isDefault: false })));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSavingGoals(false);
    }
  }

  async function addPhase() {
    const label = newPhaseLabel.trim();
    if (!label) return;
    setAddingPhase(true);
    try {
      const res = await fetch("/api/teams/catalog/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        const created = await res.json() as CatalogPhase;
        setPhases((prev) => [...prev, created]);
        setNewPhaseLabel("");
      }
    } finally {
      setAddingPhase(false);
    }
  }

  async function deletePhase(id: string) {
    const res = await fetch(`/api/teams/catalog/phases/${id}`, { method: "DELETE" });
    if (res.ok) setPhases((prev) => prev.filter((p) => p.id !== id));
  }

  async function editPhase(id: string, label: string) {
    const res = await fetch(`/api/teams/catalog/phases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const updated = await res.json() as CatalogPhase;
      setPhases((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Configuración del equipo"
        title="Catálogo de objetivos y fases"
        description="Define qué objetivos y etiquetas de fase verán los atletas y el equipo al hacer el alta. Los cambios se aplican en el próximo onboarding."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-surface" />
      ) : !teamId ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-sm text-foreground/60">No se encontró equipo activo. Completa el alta de un atleta primero para crear el equipo base.</p>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-2">
          {/* Objetivos */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Objetivos del equipo</h2>
              <button
                type="button"
                onClick={saveGoals}
                disabled={savingGoals}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
              >
                {savingGoals ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            </div>
            <p className="text-sm text-foreground/60">
              Muestra u oculta objetivos y personaliza sus etiquetas para este equipo.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {goals.map((g) => (
                <GoalCard
                  key={g.code}
                  goal={g}
                  onToggle={() => updateGoalLocal(g.code, { isVisible: !g.isVisible })}
                  onEdit={(label, description) => updateGoalLocal(g.code, { label, description: description || null })}
                />
              ))}
            </div>
          </div>

          {/* Fases */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Fases del equipo</h2>
            <p className="text-sm text-foreground/60">
              Crea etiquetas de fase reutilizables. En el onboarding el coach podrá elegir una en lugar de escribir a mano.
            </p>

            <div className="flex gap-2">
              <input
                id={`${formId}-new-phase`}
                type="text"
                value={newPhaseLabel}
                onChange={(e) => setNewPhaseLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addPhase()}
                placeholder="Ej: Bloque de definición, Semana de descarga…"
                className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={() => void addPhase()}
                disabled={addingPhase || !newPhaseLabel.trim()}
                className="shrink-0 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
              >
                + Añadir
              </button>
            </div>

            {phases.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-foreground/50">
                Sin fases configuradas. Añade la primera arriba.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {phases.map((p) => (
                  <PhaseRow
                    key={p.id}
                    phase={p}
                    onDelete={() => void deletePhase(p.id)}
                    onEdit={(label) => void editPhase(p.id, label)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuración del equipo (multi-tenant) */}
      <TeamSettingsEditor />

      {/* Contrato legal */}
      <ContractEditor />
    </main>
  );
}
