"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionIntro } from "@/components/section-intro";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";

type Photo = {
  id: string;
  url: string;
  pose: string | null;
  weekLabel: string | null;
  weightKg: number | null;
  takenAt: string;
  notes: string | null;
};

const POSE_LABELS: Record<string, string> = {
  front: "Frontal",
  back: "Espalda",
  side: "Lateral",
  relaxed: "Relajado",
  posed: "Posado",
};

export default function ProgressPhotosPage() {
  const { data: session } = useSession();
  const { pushToast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [pose, setPose] = useState("front");
  const [weekLabel, setWeekLabel] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");

  // Resolución del athleteId desde la API de perfil
  useEffect(() => {
    fetch("/api/me/athlete")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { id?: string } | null) => { if (data?.id) setAthleteId(data.id); })
      .catch(() => null);
    void session;
  }, [session]);

  async function load() {
    if (!athleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/progress-photos?athleteId=${athleteId}`);
      if (res.ok) setPhotos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [athleteId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !athleteId) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("athleteId", athleteId);
    form.append("pose", pose);
    if (weekLabel) form.append("weekLabel", weekLabel);
    if (weightKg) form.append("weightKg", weightKg);
    if (notes) form.append("notes", notes);

    try {
      const res = await fetch("/api/progress-photos", { method: "POST", body: form });
      if (res.ok) {
        pushToast({ title: "Foto subida", variant: "success" });
        setPose("front");
        setWeekLabel("");
        setWeightKg("");
        setNotes("");
        if (fileRef.current) fileRef.current.value = "";
        await load();
      } else {
        const err: { error?: string } = await res.json().catch(() => ({}));
        pushToast({ title: err.error ?? "Error al subir foto", variant: "error" });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/progress-photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((p) => p.filter((x) => x.id !== id));
      setCompare(([a, b]) => [a === id ? null : a, b === id ? null : b]);
      pushToast({ title: "Foto eliminada", variant: "success" });
    }
  }

  function toggleCompare(id: string) {
    setCompare(([a, b]) => {
      if (a === id) return [null, b];
      if (b === id) return [a, null];
      if (!a) return [id, b];
      if (!b) return [a, id];
      return [id, b];
    });
  }

  const photoA = photos.find((p) => p.id === compare[0]);
  const photoB = photos.find((p) => p.id === compare[1]);

  if (!athleteId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-foreground/50">No se pudo identificar el atleta.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Progreso visual"
        title="Fotos de progreso"
        description="Sube y compara fotos para ver la evolución semana a semana."
      />

      {/* Comparador */}
      {(photoA || photoB) && (
        <section className="rounded-4xl border border-line bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Comparativa</h2>
            <button
              type="button"
              onClick={() => setCompare([null, null])}
              className="text-xs text-foreground/50 hover:text-foreground"
            >
              Limpiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[photoA, photoB].map((photo, i) =>
              photo ? (
                <div key={i} className="overflow-hidden rounded-3xl border border-line">
                  <div className="relative aspect-[3/4] w-full">
                    <Image src={photo.url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                  </div>
                  <div className="bg-surface-strong px-3 py-2 text-xs text-foreground/60">
                    {photo.weekLabel ?? "Sin semana"} · {POSE_LABELS[photo.pose ?? ""] ?? photo.pose ?? "—"}
                    {photo.weightKg ? ` · ${photo.weightKg} kg` : ""}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex aspect-[3/4] items-center justify-center rounded-3xl border border-dashed border-line text-sm text-foreground/30">
                  Selecciona una foto
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Upload form */}
      <section className="rounded-4xl border border-line bg-surface p-6">
        <h2 className="mb-5 text-lg font-semibold">Subir foto</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/75">Foto *</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                required
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/75">Pose</label>
              <select
                value={pose}
                onChange={(e) => setPose(e.target.value)}
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {Object.entries(POSE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/75">Semana</label>
              <input
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Semana 6"
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/75">Peso ese dia (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="82.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/75">Notas</label>
            <textarea
              rows={2}
              className="w-full rounded-2xl border border-line bg-surface-strong px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Semana de volumen pico, buena hidratacion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-40"
          >
            {uploading ? "Subiendo..." : "Subir foto"}
          </button>
        </form>
      </section>

      {/* Gallery */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Galeria</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-surface-strong" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line px-6 py-10 text-center text-sm text-foreground/50">
            Sin fotos todavia. Sube la primera para empezar a ver la evolucion.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => {
              const selected = compare[0] === photo.id || compare[1] === photo.id;
              return (
                <div
                  key={photo.id}
                  className={`group relative overflow-hidden rounded-3xl border transition ${
                    selected ? "border-accent ring-2 ring-accent/40" : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCompare(photo.id)}
                    className="w-full"
                    title="Seleccionar para comparar"
                  >
                    <div className="relative aspect-[3/4] w-full">
                      <Image src={photo.url} alt={photo.weekLabel ?? "Foto"} fill className="object-cover" />
                    </div>
                  </button>
                  <div className="bg-surface-strong px-3 py-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {photo.weekLabel ?? "—"} · {POSE_LABELS[photo.pose ?? ""] ?? photo.pose ?? "—"}
                    </p>
                    {photo.weightKg ? (
                      <p className="text-xs text-foreground/50">{photo.weightKg} kg</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute right-2 top-2 hidden rounded-full bg-danger px-2 py-1 text-[10px] font-semibold text-white group-hover:block"
                  >
                    Borrar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
