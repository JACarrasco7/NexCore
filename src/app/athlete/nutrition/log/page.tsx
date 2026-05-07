"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionIntro } from "@/components/section-intro";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type NutritionLog = {
  id: string;
  loggedAt: string;
  mealName: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
  photoUrl: string | null;
};

function MacroBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  if (value == null) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <span className="font-semibold">{value.toFixed(0)}g</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

export default function NutritionLogPage() {
  const { data: session } = useSession();
  const { pushToast } = useToast();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [mealName, setMealName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/me/athlete")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string } | null) => {
        if (data?.id) setAthleteId(data.id);
      })
      .catch(() => null);
    void session;
  }, [session]);

  async function load() {
    if (!athleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nutrition-logs?athleteId=${athleteId}`);
      if (res.ok) {
        const payload = await res.json() as { items?: typeof logs } | typeof logs;
        setLogs(Array.isArray(payload) ? payload : (payload.items ?? []));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [athleteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!athleteId) return;
    setSaving(true);
    try {
      const photo = photoRef.current?.files?.[0];
      let body: FormData | string;
      const headers: Record<string, string> = {};

      if (photo) {
        const form = new FormData();
        form.append("athleteId", athleteId);
        if (mealName) form.append("mealName", mealName);
        if (kcal) form.append("kcal", kcal);
        if (proteinG) form.append("proteinG", proteinG);
        if (carbsG) form.append("carbsG", carbsG);
        if (fatG) form.append("fatG", fatG);
        if (notes) form.append("notes", notes);
        form.append("photo", photo);
        body = form;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          athleteId,
          mealName: mealName || undefined,
          kcal: kcal ? parseFloat(kcal) : undefined,
          proteinG: proteinG ? parseFloat(proteinG) : undefined,
          carbsG: carbsG ? parseFloat(carbsG) : undefined,
          fatG: fatG ? parseFloat(fatG) : undefined,
          notes: notes || undefined,
        });
      }

      const res = await fetch("/api/nutrition-logs", { method: "POST", headers, body });
      if (res.ok) {
        pushToast({ title: "Comida registrada", variant: "success" });
        setMealName("");
        setKcal("");
        setProteinG("");
        setCarbsG("");
        setFatG("");
        setNotes("");
        if (photoRef.current) photoRef.current.value = "";
        await load();
      } else {
        const err: { error?: string } = await res.json().catch(() => ({}));
        pushToast({ title: err.error ?? "Error al registrar", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const res = await fetch(`/api/nutrition-logs/${pendingDelete}`, { method: "DELETE" });
    if (res.ok) {
      setLogs((l) => l.filter((x) => x.id !== pendingDelete));
      pushToast({ title: "Registro eliminado", variant: "success" });
    }
    setPendingDelete(null);
  }

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.loggedAt.startsWith(today));
  const totalKcal = todayLogs.reduce((s, l) => s + (l.kcal ?? 0), 0);
  const totalProtein = todayLogs.reduce((s, l) => s + (l.proteinG ?? 0), 0);
  const totalCarbs = todayLogs.reduce((s, l) => s + (l.carbsG ?? 0), 0);
  const totalFat = todayLogs.reduce((s, l) => s + (l.fatG ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Nutricion"
        title="Registro de comidas"
        description="Anota tus comidas y macros del dia."
      />

      {todayLogs.length > 0 && (
        <div className="rounded-4xl border border-line bg-surface p-5 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-foreground/70">Total hoy:</span>
          <span className="text-sm font-bold">{totalKcal.toFixed(0)} kcal</span>
          <MacroBadge label="Prot" value={totalProtein} color="bg-success/10 text-success" />
          <MacroBadge label="Carbs" value={totalCarbs} color="bg-accent/10 text-accent" />
          <MacroBadge label="Grasas" value={totalFat} color="bg-warning/10 text-warning" />
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-4xl border border-line bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold">Añadir comida</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground/70 mb-1">Nombre</label>
              <input
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent"
                placeholder="Desayuno, Almuerzo, Cena..."
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Kcal</label>
              <input type="number" min="0" step="1" className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Proteina (g)</label>
              <input type="number" min="0" step="0.1" className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Carbos (g)</label>
              <input type="number" min="0" step="0.1" className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="60" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Grasas (g)</label>
              <input type="number" min="0" step="0.1" className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="15" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground/70 mb-1">Notas (opcional)</label>
              <input className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Descripcion rapida" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground/70 mb-1">Foto del plato (opcional)</label>
              <input ref={photoRef} type="file" accept="image/*" className="text-sm text-foreground/60" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !athleteId}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar comida"}
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Historial reciente</h2>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)
          ) : logs.length === 0 ? (
            <div className="rounded-4xl border border-line bg-surface p-8 text-center text-sm text-foreground/50">Sin registros aun. Registra tu primera comida.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-4 rounded-3xl border border-line bg-surface p-4">
                {log.photoUrl && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl">
                    <Image src={log.photoUrl} alt="Foto plato" fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{log.mealName ?? "Comida"}</span>
                    <button
                      onClick={() => setPendingDelete(log.id)}
                      className="text-foreground/30 hover:text-danger text-xs flex-shrink-0 transition"
                      aria-label="Eliminar registro"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-foreground/50 mb-1.5">
                    {new Date(log.loggedAt).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {log.kcal != null && (
                      <span className="text-xs font-semibold">{log.kcal.toFixed(0)} kcal</span>
                    )}
                    <MacroBadge label="P" value={log.proteinG} color="bg-success/10 text-success" />
                    <MacroBadge label="C" value={log.carbsG} color="bg-accent/10 text-accent" />
                    <MacroBadge label="G" value={log.fatG} color="bg-warning/10 text-warning" />
                  </div>
                  {log.notes && (
                    <p className="text-xs text-foreground/50 mt-1 truncate">{log.notes}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar registro"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </main>
  );
}
