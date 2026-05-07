"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

type Props = { athleteId: string };

export function AthletePhotosTab({ athleteId }: Props) {
  const { pushToast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/progress-photos?athleteId=${athleteId}`);
      if (res.ok) setPhotos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [athleteId]);

  async function handleDelete() {
    if (!pendingDelete) return;
    const res = await fetch(`/api/progress-photos/${pendingDelete}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((p) => p.filter((x) => x.id !== pendingDelete));
      setCompare(([a, b]) => [a === pendingDelete ? null : a, b === pendingDelete ? null : b]);
      pushToast({ title: "Foto eliminada", variant: "success" });
    }
    setPendingDelete(null);
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

  return (
    <div className="space-y-6">
      {/* Comparador */}
      {(photoA || photoB) && (
        <div className="rounded-4xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Comparativa</h3>
            <button type="button" onClick={() => setCompare([null, null])} className="text-xs text-foreground/50 hover:text-foreground">
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
        </div>
      )}

      {/* Galería */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-surface-strong" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-10 text-center text-sm text-foreground/50">
          El atleta aun no ha subido fotos de progreso.
        </div>
      ) : (
        <>
          <p className="text-xs text-foreground/45">Pulsa dos fotos para comparar</p>
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
                  <button type="button" onClick={() => toggleCompare(photo.id)} className="w-full">
                    <div className="relative aspect-[3/4] w-full">
                      <Image src={photo.url} alt={photo.weekLabel ?? "Foto"} fill className="object-cover" />
                    </div>
                  </button>
                  <div className="bg-surface-strong px-3 py-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {photo.weekLabel ?? "—"} · {POSE_LABELS[photo.pose ?? ""] ?? photo.pose ?? "—"}
                    </p>
                    {photo.weightKg ? <p className="text-xs text-foreground/50">{photo.weightKg} kg</p> : null}
                    {photo.notes ? <p className="mt-1 line-clamp-2 text-xs text-foreground/40">{photo.notes}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(photo.id)}
                    className="absolute right-2 top-2 hidden rounded-full bg-danger px-2 py-1 text-[10px] font-semibold text-white group-hover:block"
                  >
                    Borrar
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar foto"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
