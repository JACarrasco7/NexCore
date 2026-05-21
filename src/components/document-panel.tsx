"use client";

import { useEffect, useRef, useState } from "react";
import SignDocumentButton from "./sign-document-button";
import { apiFetch } from '@/lib/store'

type Doc = {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  notes?: string | null;
  createdAt: string;
};

const PRESET_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "general", label: "General" },
  { value: "dieta", label: "Dieta" },
  { value: "plan_pdf", label: "Plan PDF" },
  { value: "analisis", label: "Analisis" },
  { value: "progreso", label: "Progreso" },
];

const CATEGORY_LABELS: Record<string, string> = {
  dieta: "Dieta",
  plan_pdf: "Plan PDF",
  analisis: "Analisis",
  progreso: "Progreso",
  general: "General",
  DIETA: "Dieta",
  PLAN_PDF: "Plan PDF",
  ANALISIS: "Analisis",
  PROGRESO: "Progreso",
  GENERAL: "General",
};

const CATEGORY_TONES: Record<string, string> = {
  DIETA: "bg-success/10 text-success",
  PLAN_PDF: "bg-accent/10 text-accent",
  ANALISIS: "bg-warning/10 text-warning",
  PROGRESO: "bg-foreground/5 text-foreground/60",
  GENERAL: "bg-foreground/5 text-foreground/50",
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPanel({ athleteId }: { athleteId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [newCategory, setNewCategory] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const customStorageKey = `doc-categories-${athleteId}`;

  useEffect(() => {
    const stored = localStorage.getItem(customStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) setCustomCategories(parsed.filter(Boolean));
      } catch {
        // ignore invalid localStorage
      }
    }

    apiFetch<Doc[]>(`/api/documents?athleteId=${athleteId}`)
      .then((data) => {
        const nextDocs = Array.isArray(data) ? data : [];
        setDocs(nextDocs);

        const presetValues = new Set(PRESET_CATEGORIES.map((c) => c.value));
        const presetLabels = new Set(PRESET_CATEGORIES.map((c) => c.label.toLowerCase()));
        const customFromDocs = nextDocs
          .map((d: Doc) => d.category)
          .filter((c: string) => c && !presetValues.has(c.toLowerCase()) && !presetLabels.has(c.toLowerCase()));

        if (customFromDocs.length > 0) {
          setCustomCategories((prev) => {
            const merged = Array.from(new Set([...prev, ...customFromDocs]));
            localStorage.setItem(customStorageKey, JSON.stringify(merged));
            return merged;
          });
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [athleteId, customStorageKey]);

  function addCustomCategory() {
    const value = newCategory.trim();
    if (!value) return;
    setCustomCategories((prev) => {
      const merged = Array.from(new Set([...prev, value]));
      localStorage.setItem(customStorageKey, JSON.stringify(merged));
      return merged;
    });
    setSelectedCategory(value);
    setNewCategory("");
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("athleteId", athleteId);
    fd.set("category", selectedCategory);

    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) { setError("Selecciona un archivo."); return; }

    setUploading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Error al subir.");
      } else {
        const doc: Doc = await res.json();
        setDocs((prev) => [doc, ...prev]);
        const presetValues = new Set(PRESET_CATEGORIES.map((c) => c.value));
        const presetLabels = new Set(PRESET_CATEGORIES.map((c) => c.label.toLowerCase()));
        if (!presetValues.has(doc.category.toLowerCase()) && !presetLabels.has(doc.category.toLowerCase())) {
          setCustomCategories((prev) => {
            const merged = Array.from(new Set([...prev, doc.category]));
            localStorage.setItem(customStorageKey, JSON.stringify(merged));
            return merged;
          });
        }
        setShowForm(false);
        formRef.current?.reset();
        setSelectedCategory("general");
      }
    } catch {
      setError("Error de red.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  const groupedDocs = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    const cat = d.category || "General";
    acc[cat] = acc[cat] ? [...acc[cat], d] : [d];
    return acc;
  }, {});

  const orderedCategories = Object.keys(groupedDocs).sort((a, b) => a.localeCompare(b));

  return (
    <section className="rounded-4xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Documentos</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full border border-line bg-surface-strong px-4 py-1.5 text-xs font-medium transition hover:border-accent/40"
        >
          {showForm ? "Cancelar" : "+ Subir"}
        </button>
      </div>

      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleUpload}
          className="mt-5 rounded-3xl border border-line bg-surface-strong p-5 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/60">Título</label>
              <input
                name="title"
                placeholder="Ej. Dieta semana 1"
                className="rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/60">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent/50"
              >
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                {customCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nueva categoría: Movilidad, Máquinas gym, Analíticas..."
              className="rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium transition hover:border-accent/40"
            >
              + Crear categoría
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground/60">Archivo (PDF, JPG, PNG — máx 10 MB)</label>
            <input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              className="rounded-xl border border-line bg-background px-3 py-2 text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground/60">Notas (opcional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Instrucciones, observaciones..."
              className="resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </div>
          {error && <p className="rounded-xl bg-danger/10 px-4 py-2 text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {uploading ? "Subiendo..." : "Subir documento"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-foreground/40">Cargando...</p>
      ) : docs.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/40">Sin documentos adjuntos todavía.</p>
      ) : (
        <div className="mt-5 space-y-5">
          {orderedCategories.map((category) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/45">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <ul className="space-y-3">
                {groupedDocs[category].map((doc) => (
                  <li key={doc.id} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface-strong px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-sm font-semibold hover:text-accent transition"
                        >
                          {doc.title}
                        </a>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_TONES[doc.category] ?? "bg-foreground/5 text-foreground/50"}`}>
                          {CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-foreground/40">
                        {doc.fileName} · {fmtSize(doc.sizeBytes)} ·{" "}
                        {new Date(doc.createdAt).toLocaleDateString("es-ES")}
                      </p>
                      {doc.notes && (
                        <p className="mt-1 text-xs italic text-foreground/50">{doc.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.mimeType === "application/pdf" && (
                        <SignDocumentButton documentId={doc.id} />
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Eliminar"
                        className="shrink-0 rounded-lg border border-line px-2 py-1 text-xs text-danger/60 transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
