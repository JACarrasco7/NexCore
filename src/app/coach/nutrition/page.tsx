"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useNutritionPlans } from "@/lib/store";
import { parseNutritionCsv } from "@/lib/food-csv";
import { SplitLayout } from "@/components/layout/split-layout";
import type { Meal, MealFood, NutritionPlan } from "@/lib/domain";

// ── Types for the form ────────────────────────────────────────────────────────

type FoodDraft = Omit<MealFood, "id"> & { _key: string };
type MealDraft = { _key: string; name: string; time: string; order: number; foods: FoodDraft[] };

type MealTemplate = {
  id?: string; // presente si está guardado en BD
  name: string;
  meals: Array<{
    name: string;
    time: string;
    foods: Array<{
      food: string;
      quantity: number;
      unit: string;
      kcal?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    }>;
  }>;
};

function newFood(order: number): FoodDraft {
  return { _key: crypto.randomUUID(), food: "", quantity: 100, unit: "g", kcal: undefined, proteinG: undefined, carbsG: undefined, fatG: undefined, order };
}
function newMeal(order: number): MealDraft {
  return { _key: crypto.randomUUID(), name: "", time: "", order, foods: [newFood(0)] };
}

// ── Read-only plan view ───────────────────────────────────────────────────────

function PlanReadView({
  plan,
  onEdit,
  onDelete,
}: {
  plan: NutritionPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">{plan.title}</h3>
          <span className="text-xs text-foreground/50">{plan.phase}</span>
          {plan.isActive && (
            <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
              Activo
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-foreground/70 hover:text-foreground transition"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
          >
            Borrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-background/50 p-2">
          <div className="font-bold text-accent">{plan.kcalTarget}</div>
          <div className="text-xs text-foreground/40">kcal</div>
        </div>
        <div className="rounded-lg bg-(--macro-protein)/10 p-2">
          <div className="font-bold text-(--macro-protein)">{plan.proteinG}g</div>
          <div className="text-xs text-foreground/40">Prot.</div>
        </div>
        <div className="rounded-lg bg-(--macro-carbs)/10 p-2">
          <div className="font-bold text-(--macro-carbs)">{plan.carbsG}g</div>
          <div className="text-xs text-foreground/40">Carbs</div>
        </div>
        <div className="rounded-lg bg-(--macro-fat)/10 p-2">
          <div className="font-bold text-(--macro-fat)">{plan.fatG}g</div>
          <div className="text-xs text-foreground/40">Grasas</div>
        </div>
      </div>

      <div className="space-y-1">
        {plan.meals.map((meal) => (
          <div key={meal.id} className="rounded-lg border border-line/50">
            <button
              onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-sm font-medium text-foreground">{meal.name}</span>
              <div className="flex items-center gap-2 text-xs text-foreground/40">
                <span>{meal.time}</span>
                <span>{meal.foods.reduce((s, f) => s + (f.kcal ?? 0), 0)} kcal</span>
                <span>{expandedMeal === meal.id ? "▲" : "▼"}</span>
              </div>
            </button>
            {expandedMeal === meal.id && (
              <div className="border-t border-line/40 px-3 pb-2">
                {meal.foods.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 py-1 text-xs text-foreground/70">
                    <span className="flex-1">{f.food}</span>
                    <span>{f.quantity} {f.unit}</span>
                    <span className="text-(--macro-protein)">{f.proteinG != null ? `P${f.proteinG}g` : ""}</span>
                    <span className="text-(--macro-carbs)">{f.carbsG != null ? `C${f.carbsG}g` : ""}</span>
                    <span className="text-(--macro-fat)">{f.fatG != null ? `G${f.fatG}g` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plan form (create / edit) ─────────────────────────────────────────────────

type FoodResolveResponse = {
  source: string;
  item: {
    name: string;
    unit: string;
  } | null;
  macros?: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

type FoodSearchResponse = {
  source: string;
  results: Array<{
    name: string;
    unit: string;
  }>;
};

type FoodEquivalenceResponse = {
  source: string;
  base: {
    name: string;
    quantity: number;
    unit: string;
    kcal: number;
  } | null;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    kcal: number;
  }>;
};

function PlanForm({
  athleteId,
  initial,
  onSaved,
  onCancel,
}: {
  athleteId: string;
  initial?: NutritionPlan;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [phase, setPhase] = useState(initial?.phase ?? "Activo");
  const [kcal, setKcal] = useState(initial?.kcalTarget ?? 2000);
  const [prot, setProt] = useState(initial?.proteinG ?? 150);
  const [carbs, setCarbs] = useState(initial?.carbsG ?? 200);
  const [fat, setFat] = useState(initial?.fatG ?? 65);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [meals, setMeals] = useState<MealDraft[]>(() =>
    initial?.meals.map((m) => ({
      _key: m.id,
      name: m.name,
      time: m.time,
      order: m.order,
      foods: m.foods.map((f) => ({
        _key: f.id,
        food: f.food,
        quantity: f.quantity,
        unit: f.unit,
        kcal: f.kcal ?? undefined,
        proteinG: f.proteinG ?? undefined,
        carbsG: f.carbsG ?? undefined,
        fatG: f.fatG ?? undefined,
        order: f.order,
      })),
    })) ?? [newMeal(0)]
  );
  const [saving, setSaving] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [equivByFoodKey, setEquivByFoodKey] = useState<Record<string, string[]>>({});
  const [csvText, setCsvText] = useState("");
  const [csvInfo, setCsvInfo] = useState<string | null>(null);
  const [calcWeight, setCalcWeight] = useState<number>(75);
  const [calcMode, setCalcMode] = useState<"cut" | "maintain" | "bulk">("maintain");
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [foodHints, setFoodHints] = useState<Record<string, string[]>>({});
  const [catalogSource, setCatalogSource] = useState<string>("Apex-MFP");
  const [foodProvider, setFoodProvider] = useState<"auto" | "mfp" | "local">("auto");

  useEffect(() => {
    fetch("/api/nutrition-templates")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Array<{ id: string; name: string; meals: unknown }>) => {
        const parsed: MealTemplate[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          meals: r.meals as MealTemplate["meals"],
        }));
        setTemplates(parsed);
      })
      .catch(() => setTemplates([]));
  }, []);

  async function resolveFromCatalog(mealKey: string, food: FoodDraft) {
    const quantity = Number(food.quantity || 100);
    const q = encodeURIComponent(food.food);
    setResolvingKey(food._key);
    try {
      const res = await fetch(`/api/food-catalog?action=resolve&provider=${foodProvider}&food=${q}&quantity=${quantity}`);
      if (!res.ok) return;
      const data = (await res.json()) as FoodResolveResponse;
      setCatalogSource(data.source ?? "Apex-MFP");
      if (!data.item || !data.macros) return;

      updateFood(mealKey, food._key, {
        food: data.item.name,
        unit: data.item.unit,
        kcal: data.macros.kcal,
        proteinG: data.macros.proteinG,
        carbsG: data.macros.carbsG,
        fatG: data.macros.fatG,
      });
    } finally {
      setResolvingKey(null);
    }
  }

  async function loadEquivalences(food: FoodDraft) {
    const quantity = Number(food.quantity || 100);
    const q = encodeURIComponent(food.food);
    const res = await fetch(`/api/food-catalog?action=equivalences&provider=${foodProvider}&food=${q}&quantity=${quantity}`);
    if (!res.ok) return;
    const data = (await res.json()) as FoodEquivalenceResponse;
    setCatalogSource(data.source ?? "Apex-MFP");
    if (!data.items?.length) {
      setEquivByFoodKey((prev) => ({ ...prev, [food._key]: [] }));
      return;
    }
    const lines = data.items.map((item) => `${item.quantity}${item.unit} ${item.name} (~${item.kcal} kcal)`);
    setEquivByFoodKey((prev) => ({ ...prev, [food._key]: lines }));
  }

  async function suggestFoods(food: FoodDraft) {
    const q = food.food.trim();
    if (q.length < 2) {
      setFoodHints((prev) => ({ ...prev, [food._key]: [] }));
      return;
    }

    const res = await fetch(`/api/food-catalog?action=search&provider=${foodProvider}&q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = (await res.json()) as FoodSearchResponse;
    setCatalogSource(data.source ?? "Apex-MFP");
    setFoodHints((prev) => ({
      ...prev,
      [food._key]: data.results.map((r) => r.name).slice(0, 5),
    }));
  }

  function importCsvRows() {
    const rows = parseNutritionCsv(csvText);
    if (!rows.length) {
      setCsvInfo("CSV sin filas válidas. Revisa cabeceras: meal, time, food, quantity, unit, kcal, protein, carbs, fat.");
      return;
    }

    const byMeal = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const key = `${row.mealName}__${row.mealTime}`;
      const bucket = byMeal.get(key) ?? [];
      bucket.push(row);
      byMeal.set(key, bucket);
    });

    setMeals((prev) => {
      const next = [...prev];
      byMeal.forEach((foods, key) => {
        const [mealName, mealTime] = key.split("__");
        const existing = next.find((m) => m.name.toLowerCase() === mealName.toLowerCase() && (m.time || "") === (mealTime || ""));

        if (existing) {
          const startOrder = existing.foods.length;
          const importedFoods = foods.map((f, idx) => ({
            _key: crypto.randomUUID(),
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: startOrder + idx,
          }));
          existing.foods = [...existing.foods, ...importedFoods];
          return;
        }

        const order = next.length;
        next.push({
          _key: crypto.randomUUID(),
          name: mealName || `Comida ${order + 1}`,
          time: mealTime || "",
          order,
          foods: foods.map((f, idx) => ({
            _key: crypto.randomUUID(),
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: idx,
          })),
        });
      });
      return next;
    });

    setCsvInfo(`Importadas ${rows.length} filas en ${byMeal.size} comida(s).`);
    setCsvText("");
  }

  function autoCalculateMacros() {
    const weight = Math.max(40, Number(calcWeight) || 75);
    const kcalPerKg = calcMode === "cut" ? 29 : calcMode === "bulk" ? 38 : 33;
    const proteinPerKg = calcMode === "bulk" ? 2.0 : 2.2;
    const fatPerKg = calcMode === "cut" ? 0.8 : 0.9;

    const nextKcal = Math.round(weight * kcalPerKg);
    const nextProtein = Math.round(weight * proteinPerKg);
    const nextFat = Math.round(weight * fatPerKg);
    const kcalFromProteinAndFat = nextProtein * 4 + nextFat * 9;
    const nextCarbs = Math.max(0, Math.round((nextKcal - kcalFromProteinAndFat) / 4));

    setKcal(nextKcal);
    setProt(nextProtein);
    setFat(nextFat);
    setCarbs(nextCarbs);
  }

  async function saveCurrentAsTemplate() {
    const name = templateName.trim();
    if (!name) return;

    const snapshot: MealTemplate = {
      name,
      meals: meals.map((m) => ({
        name: m.name,
        time: m.time,
        foods: m.foods.map((f) => ({
          food: f.food,
          quantity: f.quantity,
          unit: f.unit,
          kcal: f.kcal ?? undefined,
          proteinG: f.proteinG ?? undefined,
          carbsG: f.carbsG ?? undefined,
          fatG: f.fatG ?? undefined,
        })),
      })),
    };

    setTemplatesSaving(true);
    try {
      // Si ya existe con ese nombre, borrarlo primero
      const existing = templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing?.id) {
        await fetch(`/api/nutrition-templates/${existing.id}`, { method: "DELETE" });
      }
      const res = await fetch("/api/nutrition-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, meals: snapshot.meals }),
      });
      if (res.ok) {
        const saved = await res.json() as { id: string; name: string; meals: unknown };
        const withoutSameName = templates.filter((t) => t.name.toLowerCase() !== name.toLowerCase());
        setTemplates([{ id: saved.id, name: saved.name, meals: saved.meals as MealTemplate["meals"] }, ...withoutSameName].slice(0, 20));
      }
    } finally {
      setTemplatesSaving(false);
    }
    setTemplateName("");
  }

  function applyTemplate(name: string) {
    const tpl = templates.find((t) => t.name === name);
    if (!tpl) return;

    const nextMeals: MealDraft[] = tpl.meals.map((m, i) => ({
      _key: crypto.randomUUID(),
      name: m.name,
      time: m.time,
      order: i,
      foods: m.foods.map((f, j) => ({
        _key: crypto.randomUUID(),
        food: f.food,
        quantity: f.quantity,
        unit: f.unit,
        kcal: f.kcal,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        order: j,
      })),
    }));

    if (nextMeals.length > 0) setMeals(nextMeals);
  }

  async function deleteTemplate(name: string) {
    const tpl = templates.find((t) => t.name === name);
    if (tpl?.id) {
      await fetch(`/api/nutrition-templates/${tpl.id}`, { method: "DELETE" });
    }
    setTemplates((prev) => prev.filter((t) => t.name !== name));
    if (selectedTemplate === name) setSelectedTemplate("");
  }

  function updateMeal(key: string, patch: Partial<MealDraft>) {
    setMeals((ms) => ms.map((m) => (m._key === key ? { ...m, ...patch } : m)));
  }

  function updateFood(mealKey: string, foodKey: string, patch: Partial<FoodDraft>) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey
          ? { ...m, foods: m.foods.map((f) => (f._key === foodKey ? { ...f, ...patch } : f)) }
          : m
      )
    );
  }

  function addFood(mealKey: string) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey ? { ...m, foods: [...m.foods, newFood(m.foods.length)] } : m
      )
    );
  }

  function removeFood(mealKey: string, foodKey: string) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey ? { ...m, foods: m.foods.filter((f) => f._key !== foodKey) } : m
      )
    );
  }

  function addMeal() {
    setMeals((ms) => [...ms, newMeal(ms.length)]);
  }

  function removeMeal(key: string) {
    setMeals((ms) => ms.filter((m) => m._key !== key));
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        athleteId,
        title: title.trim(),
        phase,
        kcalTarget: kcal,
        proteinG: prot,
        carbsG: carbs,
        fatG: fat,
        notes: notes || undefined,
        meals: meals.map((m, i) => ({
          name: m.name,
          time: m.time,
          order: i,
          foods: m.foods.map((f, j) => ({
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: j,
          })),
        })),
      };

      if (initial) {
        // For now delete + recreate (simplest approach)
        await fetch(`/api/nutrition-plans/${initial.id}`, { method: "DELETE" });
        await fetch("/api/nutrition-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/nutrition-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none";
  const numCls = "rounded-lg border border-line bg-background px-2 py-1.5 text-sm text-foreground text-right focus:border-accent/50 focus:outline-none w-20";

  return (
    <div className="rounded-2xl border border-accent/20 bg-surface p-5 space-y-5">
      <h3 className="font-semibold text-foreground">
        {initial ? "Editar plan" : "Nuevo plan nutricional"}
      </h3>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs text-foreground/50">Título</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Dieta Volumen S8" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Fase</label>
          <input className={inputCls} value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Volumen / Corte…" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">kcal objetivo</label>
          <input className={inputCls} type="number" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-3">
        {([["Proteína (g)", prot, setProt], ["Carbos (g)", carbs, setCarbs], ["Grasas (g)", fat, setFat]] as const).map(
          ([label, val, setter]) => (
            <div key={label}>
              <label className="mb-1 block text-xs text-foreground/50">{label}</label>
              <input
                className={inputCls}
                type="number"
                value={val}
                onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
              />
            </div>
          )
        )}
      </div>

      {/* Auto-cálculo */}
      <div className="rounded-xl border border-line bg-background/40 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-foreground/50">Peso atleta (kg)</label>
            <input
              type="number"
              className="w-28 rounded-lg border border-line bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent/50 focus:outline-none"
              value={calcWeight}
              onChange={(e) => setCalcWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/50">Objetivo</label>
            <select
              className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent/50 focus:outline-none"
              value={calcMode}
              onChange={(e) => setCalcMode(e.target.value as "cut" | "maintain" | "bulk")}
            >
              <option value="cut">Corte</option>
              <option value="maintain">Mantenimiento</option>
              <option value="bulk">Volumen</option>
            </select>
          </div>
          <button
            onClick={autoCalculateMacros}
            className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
          >
            Auto-calcular macros
          </button>
        </div>
      </div>

      {/* Plantillas */}
      <div className="rounded-xl border border-line bg-background/40 p-3">
        <p className="text-xs text-foreground/60">Plantillas de comidas (guardadas en BD)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nombre plantilla"
            className="rounded-lg border border-line bg-background px-3 py-1.5 text-xs text-foreground focus:border-accent/50 focus:outline-none"
          />
          <button
            onClick={saveCurrentAsTemplate}
            disabled={!templateName.trim() || templatesSaving}
            className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-40"
          >
            {templatesSaving ? "Guardando…" : "Guardar plantilla"}
          </button>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rounded-lg border border-line bg-background px-3 py-1.5 text-xs text-foreground focus:border-accent/50 focus:outline-none"
          >
            <option value="">Seleccionar plantilla</option>
            {templates.map((tpl) => (
              <option key={tpl.name} value={tpl.name}>{tpl.name}</option>
            ))}
          </select>
          <button
            onClick={() => applyTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-foreground/70 hover:border-accent/30 hover:text-accent disabled:opacity-40"
          >
            Cargar
          </button>
          <button
            onClick={() => deleteTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
            className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
          >
            Borrar
          </button>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="mb-1 block text-xs text-foreground/50">Notas coach</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Indicaciones adicionales…"
        />
      </div>

      {/* Comidas */}
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-background/50 p-3">
          <p className="text-xs text-foreground/70">
            Importar CSV (MyFitnessPal-like): cabeceras soportadas
            <span className="ml-1 font-semibold text-accent">meal,time,food,quantity,unit,kcal,protein,carbs,fat</span>
          </p>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2 text-xs text-foreground focus:border-accent/50 focus:outline-none"
            placeholder={"meal,time,food,quantity,unit,kcal,protein,carbs,fat\nDesayuno,08:00,Avena,80,g,311,13.5,53.0,5.5\nDesayuno,08:00,Yogur griego 0%,200,g,118,20.6,7.2,0.8"}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={importCsvRows}
              disabled={!csvText.trim()}
              className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-40"
            >
              Importar CSV
            </button>
            {csvInfo ? <span className="text-xs text-foreground/60">{csvInfo}</span> : null}
          </div>
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-foreground/70">
          <div className="flex flex-wrap items-center gap-2">
            <span>MFP beta: usa MFP para autocalcular kcal/macros y Eq para equivalencias por calorías.</span>
            <span className="font-semibold text-accent">Fuente: {catalogSource}</span>
            <select
              value={foodProvider}
              onChange={(e) => setFoodProvider(e.target.value as "auto" | "mfp" | "local")}
              className="rounded border border-line bg-background px-1.5 py-0.5 text-[11px] text-foreground"
              title="Proveedor de datos de alimentos"
            >
              <option value="auto">Auto</option>
              <option value="mfp">MyFitnessPal</option>
              <option value="local">Local</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground/70">Comidas</h4>
          <button onClick={addMeal} className="text-xs text-accent hover:underline">
            + Añadir comida
          </button>
        </div>

        {meals.map((meal, mi) => (
          <div key={meal._key} className="rounded-xl border border-line bg-background/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm text-foreground focus:border-accent/50 focus:outline-none"
                placeholder={`Comida ${mi + 1} (ej: Desayuno)`}
                value={meal.name}
                onChange={(e) => updateMeal(meal._key, { name: e.target.value })}
              />
              <input
                className="w-24 rounded-lg border border-line bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent/50 focus:outline-none"
                placeholder="Hora"
                value={meal.time}
                onChange={(e) => updateMeal(meal._key, { time: e.target.value })}
              />
              {meals.length > 1 && (
                <button
                  onClick={() => removeMeal(meal._key)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Alimentos */}
            <div className="space-y-2">
              {meal.foods.map((food) => (
                <div key={food._key} className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5 text-xs">
                    <input
                      className="col-span-3 rounded border border-line bg-background px-2 py-1 text-foreground focus:border-accent/50 focus:outline-none"
                      placeholder="Alimento"
                      value={food.food}
                      onChange={(e) => {
                        updateFood(meal._key, food._key, { food: e.target.value });
                        void suggestFoods({ ...food, food: e.target.value });
                      }}
                    />
                    <input
                      className="col-span-2 rounded border border-line bg-background px-2 py-1 text-right text-foreground focus:border-accent/50 focus:outline-none"
                      type="number"
                      placeholder="g/ml"
                      value={food.quantity}
                      onChange={(e) => updateFood(meal._key, food._key, { quantity: Number(e.target.value) })}
                    />
                    <input
                      className="col-span-1 rounded border border-line bg-background px-2 py-1 text-foreground focus:border-accent/50 focus:outline-none"
                      placeholder="u"
                      value={food.unit}
                      onChange={(e) => updateFood(meal._key, food._key, { unit: e.target.value })}
                    />
                    <input
                      className="col-span-1 rounded border border-line bg-background px-1 py-1 text-right text-foreground focus:border-accent/50 focus:outline-none"
                      type="number"
                      placeholder="kcal"
                      value={food.kcal ?? ""}
                      onChange={(e) => updateFood(meal._key, food._key, { kcal: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <input
                      className="col-span-1 rounded border border-success/20 bg-background px-1 py-1 text-right text-success focus:border-success/50 focus:outline-none"
                      type="number"
                      placeholder="P"
                      value={food.proteinG ?? ""}
                      onChange={(e) => updateFood(meal._key, food._key, { proteinG: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <input
                      className="col-span-1 rounded border border-(--macro-carbs)/20 bg-background px-1 py-1 text-right text-(--macro-carbs) focus:border-(--macro-carbs)/50 focus:outline-none"
                      type="number"
                      placeholder="C"
                      value={food.carbsG ?? ""}
                      onChange={(e) => updateFood(meal._key, food._key, { carbsG: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <input
                      className="col-span-1 rounded border border-warning/20 bg-background px-1 py-1 text-right text-warning focus:border-warning/50 focus:outline-none"
                      type="number"
                      placeholder="G"
                      value={food.fatG ?? ""}
                      onChange={(e) => updateFood(meal._key, food._key, { fatG: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => resolveFromCatalog(meal._key, food)}
                        disabled={!food.food.trim() || resolvingKey === food._key}
                        className="rounded border border-accent/30 px-1.5 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/10 disabled:opacity-40"
                        title="Autocalcular desde base tipo MyFitnessPal"
                      >
                        MFP
                      </button>
                      <button
                        onClick={() => loadEquivalences(food)}
                        disabled={!food.food.trim()}
                        className="rounded border border-line px-1.5 py-0.5 text-[10px] text-foreground/70 hover:border-accent/30 hover:text-accent disabled:opacity-40"
                        title="Ver equivalencias por kcal"
                      >
                        Eq
                      </button>
                      <button
                        onClick={() => removeFood(meal._key, food._key)}
                        className="text-center text-danger hover:opacity-80"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {equivByFoodKey[food._key]?.length ? (
                    <div className="rounded border border-line bg-surface-strong px-2 py-1 text-[11px] text-foreground/60">
                      <span className="mr-1 font-semibold text-foreground/80">Equivalencias:</span>
                      {equivByFoodKey[food._key].join(" · ")}
                    </div>
                  ) : null}
                  {foodHints[food._key]?.length ? (
                    <div className="rounded border border-line bg-background px-2 py-1 text-[11px] text-foreground/60">
                      <span className="mr-1 font-semibold text-foreground/80">Sugerencias:</span>
                      {foodHints[food._key].map((hint) => (
                        <button
                          key={hint}
                          onClick={() => updateFood(meal._key, food._key, { food: hint })}
                          className="mr-1 inline-flex rounded border border-line px-1.5 py-0.5 hover:border-accent/30 hover:text-accent"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              <button
                onClick={() => addFood(meal._key)}
                className="text-xs text-accent/70 hover:text-accent hover:underline"
              >
                + Alimento
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-background disabled:opacity-50 hover:bg-accent/90 transition"
        >
          {saving ? "Guardando…" : "Guardar plan"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NutritionEditorContent() {
  const searchParams = useSearchParams();
  const athleteId = searchParams.get("athleteId") ?? "";

  const { plans, loading, refresh } = useNutritionPlans(athleteId || undefined);
  const { pushToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NutritionPlan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NutritionPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!athleteId) {
    return (
      <EmptyState title="Selecciona un atleta" description="Accede a nutrición desde el perfil detallado del atleta." className="mt-12" />
    );
  }

  if (loading) {
    return <Skeleton className="mt-4 h-40" />;
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/nutrition-plans/${pendingDelete.id}`, { method: "DELETE" });
      pushToast({ title: "Plan nutricional eliminado", description: pendingDelete.title, variant: "success" });
      setPendingDelete(null);
      refresh();
    } catch {
      pushToast({ title: "No se pudo eliminar el plan", variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar plan nutricional"
        description={pendingDelete ? `Se eliminará \"${pendingDelete.title}\".` : ""}
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />

      {editing && (
        <PlanForm
          athleteId={athleteId}
          initial={editing}
          onSaved={() => { setEditing(null); refresh(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {creating && !editing && (
        <PlanForm
          athleteId={athleteId}
          onSaved={() => { setCreating(false); refresh(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {plans.map((plan) => (
        <PlanReadView
          key={plan.id}
          plan={plan}
          onEdit={() => { setCreating(false); setEditing(plan); }}
          onDelete={() => setPendingDelete(plan)}
        />
      ))}

      {plans.length === 0 && !creating && (
        <EmptyState title="Sin planes nutricionales" description="Crea el primer plan para este atleta." icon="🥗" />
      )}

      {!creating && !editing && (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/30 py-3 text-sm text-accent hover:bg-accent/5 transition"
        >
          + Crear plan nutricional
        </button>
      )}
    </div>
  );
}

type AthleteListItem = { id: string; fullName: string; goal: string; planCount: number };

function NutritionEditorWithAside() {
  const searchParams = useSearchParams();
  const athleteId = searchParams.get("athleteId") ?? "";
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/athletes")
      .then((r) => r.ok ? r.json() : [])
      .then((d: unknown[]) => {
        const mapped: AthleteListItem[] = (d as Array<{ id: string; fullName: string; goal?: string }>).map((a) => ({
          id: a.id,
          fullName: a.fullName,
          goal: a.goal ?? "",
          planCount: 0,
        }));
        setAthletes(mapped);
      })
      .catch(() => {});
  }, []);

  const filtered = athletes.filter((a) =>
    a.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const selected = athletes.find((a) => a.id === athleteId);

  const aside = (
    <div className="max-h-[calc(100vh-160px)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 space-y-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar atleta…"
          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/35 focus:border-accent/50 focus:outline-none"
        />
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-foreground/40">Sin atletas</p>
        ) : (
          <div className="space-y-0.5 pt-1">
            {filtered.map((a) => {
              const isActive = a.id === athleteId;
              const goalLabels: Record<string, string> = { VOLUMEN: "Vol", DEFINICION: "Def", MANTENIMIENTO: "Man", PEAK_WEEK: "Peak" };
              return (
                <a
                  key={a.id}
                  href={`/coach/nutrition?athleteId=${a.id}`}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${isActive ? "bg-accent/10 border border-accent/20" : "hover:bg-surface-strong"}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                    {a.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.fullName}</p>
                    <p className="text-xs text-foreground/45">{goalLabels[a.goal] ?? a.goal}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
    </div>
  );

  const main = (
    <div className="space-y-4">
      {selected && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
            {selected.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{selected.fullName}</p>
            <p className="text-xs text-foreground/45">Planes nutricionales</p>
          </div>
        </div>
      )}
      <NutritionEditorContent />
    </div>
  );

  return <SplitLayout aside={aside} main={main} variant="wide-aside" />;
}

export default function CoachNutritionPage() {
  return (
    <div className="mx-auto w-full max-w-[1480px] px-6 py-6 md:px-10 lg:px-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-foreground/40">Coach dashboard</p>
        <h1 className="mt-1 text-2xl font-bold">Nutrición</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <NutritionEditorWithAside />
      </Suspense>
    </div>
  );
}
