"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SectionIntro } from "@/components/section-intro";
import { useServicePlans } from "@/lib/store";
import type { ServicePlan } from "@/lib/domain";

function PlanCard({
  plan,
  onDelete,
}: {
  plan: ServicePlan;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-4xl border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{plan.name}</h3>
          {plan.description && (
            <p className="mt-1 text-sm text-foreground/60">{plan.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-accent">{plan.priceEur}€</div>
          <div className="text-xs text-foreground/40">/ mes</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-line px-3 py-1 text-xs text-foreground/60">
          {plan.durationWeeks} semanas
        </span>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-foreground/60">
          Check-in cada {plan.checkinFreqDays} días
        </span>
        {plan.includesNutrition && (
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
            Incluye nutricion
          </span>
        )}
        {plan._count && (
          <span className="rounded-full border border-line px-3 py-1 text-xs text-foreground/40">
            {plan._count.athletes} atleta{plan._count.athletes !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onDelete}
          className="rounded-full border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function NewPlanForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { addPlan } = useServicePlans();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(149);
  const [weeks, setWeeks] = useState(4);
  const [checkinFreq, setCheckinFreq] = useState(7);
  const [nutrition, setNutrition] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputCls =
    "w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 outline-none transition focus:border-accent";

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addPlan({
        name: name.trim(),
        description: description || undefined,
        priceEur: price,
        durationWeeks: weeks,
        checkinFreqDays: checkinFreq,
        includesNutrition: nutrition,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-4xl border border-accent/20 bg-surface p-6 space-y-4">
      <h3 className="text-xl font-semibold">Nuevo plan de servicio</h3>

      <div>
        <label className="mb-1 block text-xs text-foreground/50">Nombre</label>
        <input
          className={inputCls}
          placeholder="Ej: Plan Premium"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground/50">Descripción</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="¿Qué incluye este plan?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Precio (€)</label>
          <input
            className={inputCls}
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Duración (sem.)</label>
          <input
            className={inputCls}
            type="number"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Check-in c/ (días)</label>
          <input
            className={inputCls}
            type="number"
            value={checkinFreq}
            onChange={(e) => setCheckinFreq(Number(e.target.value))}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <div
          onClick={() => setNutrition((v) => !v)}
          className={`h-5 w-10 rounded-full transition-colors ${
            nutrition ? "bg-accent" : "bg-surface border border-line"
          } relative`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              nutrition ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
        <span className="text-sm text-foreground/70">Incluye plan nutricional</span>
      </label>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-2 text-sm text-foreground/60 hover:text-foreground transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-accent-strong transition"
        >
          {saving ? "Guardando…" : "Crear plan"}
        </button>
      </div>
    </div>
  );
}

export default function ServicePlansPage() {
  const { plans, loading, removePlan, refresh } = useServicePlans();
  const { pushToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ServicePlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await removePlan(pendingDelete.id);
      pushToast({ title: "Plan eliminado", description: pendingDelete.name, variant: "success" });
      setPendingDelete(null);
    } catch {
      pushToast({ title: "No se pudo eliminar", variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar plan"
        description={pendingDelete ? `Se eliminara "${pendingDelete.name}" y no se podra deshacer.` : ""}
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <div className="flex items-end justify-between gap-4">
        <SectionIntro
          eyebrow="Coach dashboard"
          title="Planes de servicio"
          description="Paquetes contratables por tus atletas."
        />
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            + Nuevo plan
          </button>
        )}
      </div>

      <div className="space-y-4">
        {creating && (
          <NewPlanForm
            onSaved={() => { setCreating(false); refresh(); }}
            onCancel={() => setCreating(false)}
          />
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-4xl" />
            ))}
          </div>
        ) : (
          <>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onDelete={() => setPendingDelete(plan)}
              />
            ))}

            {plans.length === 0 && !creating && (
              <EmptyState title="Sin planes definidos" description="Crea tu primer plan de servicio para empezar a asignarlo a atletas." icon="📋"
              action={(
                <button
                  onClick={() => setCreating(true)}
                  className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  + Nuevo plan
                </button>
              )}
            />
            )}
          </>
        )}
      </div>
    </main>
  );
}
