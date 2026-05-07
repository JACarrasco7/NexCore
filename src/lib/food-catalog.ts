export type FoodGroup =
  | "carb"
  | "protein"
  | "fat"
  | "fruit"
  | "dairy"
  | "legume"
  | "snack";

export type FoodCatalogItem = {
  name: string;
  unit: "g";
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  group: FoodGroup;
  source: "Apex-MFP";
};

const CATALOG: FoodCatalogItem[] = [
  { name: "Arroz cocido", unit: "g", kcalPer100: 130, proteinPer100: 2.4, carbsPer100: 28.2, fatPer100: 0.3, group: "carb", source: "Apex-MFP" },
  { name: "Pasta cocida", unit: "g", kcalPer100: 157, proteinPer100: 5.8, carbsPer100: 30.9, fatPer100: 0.9, group: "carb", source: "Apex-MFP" },
  { name: "Patata cocida", unit: "g", kcalPer100: 87, proteinPer100: 1.9, carbsPer100: 20.1, fatPer100: 0.1, group: "carb", source: "Apex-MFP" },
  { name: "Avena", unit: "g", kcalPer100: 389, proteinPer100: 16.9, carbsPer100: 66.3, fatPer100: 6.9, group: "carb", source: "Apex-MFP" },
  { name: "Pan integral", unit: "g", kcalPer100: 252, proteinPer100: 12.4, carbsPer100: 43.3, fatPer100: 3.5, group: "carb", source: "Apex-MFP" },
  { name: "Tortilla de trigo", unit: "g", kcalPer100: 310, proteinPer100: 8.3, carbsPer100: 52.0, fatPer100: 7.2, group: "carb", source: "Apex-MFP" },

  { name: "Pechuga de pollo", unit: "g", kcalPer100: 165, proteinPer100: 31.0, carbsPer100: 0, fatPer100: 3.6, group: "protein", source: "Apex-MFP" },
  { name: "Pavo", unit: "g", kcalPer100: 135, proteinPer100: 29.0, carbsPer100: 0, fatPer100: 1.6, group: "protein", source: "Apex-MFP" },
  { name: "Ternera magra", unit: "g", kcalPer100: 170, proteinPer100: 26.0, carbsPer100: 0, fatPer100: 7.0, group: "protein", source: "Apex-MFP" },
  { name: "Salmon", unit: "g", kcalPer100: 208, proteinPer100: 20.4, carbsPer100: 0, fatPer100: 13.4, group: "protein", source: "Apex-MFP" },
  { name: "Atun al natural", unit: "g", kcalPer100: 116, proteinPer100: 25.5, carbsPer100: 0, fatPer100: 0.8, group: "protein", source: "Apex-MFP" },
  { name: "Claras de huevo", unit: "g", kcalPer100: 52, proteinPer100: 10.9, carbsPer100: 0.7, fatPer100: 0.2, group: "protein", source: "Apex-MFP" },
  { name: "Huevo entero", unit: "g", kcalPer100: 143, proteinPer100: 12.6, carbsPer100: 0.7, fatPer100: 9.5, group: "protein", source: "Apex-MFP" },

  { name: "Aceite de oliva", unit: "g", kcalPer100: 884, proteinPer100: 0, carbsPer100: 0, fatPer100: 100, group: "fat", source: "Apex-MFP" },
  { name: "Mantequilla de cacahuete", unit: "g", kcalPer100: 588, proteinPer100: 25.0, carbsPer100: 20.0, fatPer100: 50.0, group: "fat", source: "Apex-MFP" },
  { name: "Nueces", unit: "g", kcalPer100: 654, proteinPer100: 15.2, carbsPer100: 13.7, fatPer100: 65.2, group: "fat", source: "Apex-MFP" },
  { name: "Almendras", unit: "g", kcalPer100: 579, proteinPer100: 21.2, carbsPer100: 21.6, fatPer100: 49.9, group: "fat", source: "Apex-MFP" },

  { name: "Platano", unit: "g", kcalPer100: 89, proteinPer100: 1.1, carbsPer100: 22.8, fatPer100: 0.3, group: "fruit", source: "Apex-MFP" },
  { name: "Manzana", unit: "g", kcalPer100: 52, proteinPer100: 0.3, carbsPer100: 13.8, fatPer100: 0.2, group: "fruit", source: "Apex-MFP" },
  { name: "Frutos rojos", unit: "g", kcalPer100: 57, proteinPer100: 0.7, carbsPer100: 14.0, fatPer100: 0.3, group: "fruit", source: "Apex-MFP" },

  { name: "Yogur griego 0%", unit: "g", kcalPer100: 59, proteinPer100: 10.3, carbsPer100: 3.6, fatPer100: 0.4, group: "dairy", source: "Apex-MFP" },
  { name: "Queso fresco batido 0%", unit: "g", kcalPer100: 46, proteinPer100: 8.0, carbsPer100: 4.0, fatPer100: 0.2, group: "dairy", source: "Apex-MFP" },
  { name: "Leche desnatada", unit: "g", kcalPer100: 34, proteinPer100: 3.4, carbsPer100: 5.0, fatPer100: 0.2, group: "dairy", source: "Apex-MFP" },

  { name: "Lentejas cocidas", unit: "g", kcalPer100: 116, proteinPer100: 9.0, carbsPer100: 20.0, fatPer100: 0.4, group: "legume", source: "Apex-MFP" },
  { name: "Garbanzos cocidos", unit: "g", kcalPer100: 164, proteinPer100: 8.9, carbsPer100: 27.4, fatPer100: 2.6, group: "legume", source: "Apex-MFP" },

  { name: "Chocolate negro 85%", unit: "g", kcalPer100: 600, proteinPer100: 12.0, carbsPer100: 19.0, fatPer100: 52.0, group: "snack", source: "Apex-MFP" },
  { name: "Granola", unit: "g", kcalPer100: 471, proteinPer100: 10.0, carbsPer100: 64.0, fatPer100: 20.0, group: "snack", source: "Apex-MFP" },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function searchFoodCatalog(query: string, limit = 8): FoodCatalogItem[] {
  const q = normalize(query);
  if (!q) return CATALOG.slice(0, limit);

  return CATALOG
    .map((item) => ({ item, score: normalize(item.name).includes(q) ? 1 : 0 }))
    .filter((x) => x.score > 0)
    .map((x) => x.item)
    .slice(0, limit);
}

export function findFoodByName(name: string): FoodCatalogItem | null {
  const q = normalize(name);
  if (!q) return null;

  const exact = CATALOG.find((f) => normalize(f.name) === q);
  if (exact) return exact;

  const contains = CATALOG.find((f) => normalize(f.name).includes(q) || q.includes(normalize(f.name)));
  return contains ?? null;
}

export function macrosForQuantity(food: FoodCatalogItem, quantity: number) {
  const factor = quantity / 100;
  return {
    kcal: Math.round(food.kcalPer100 * factor),
    proteinG: Math.round(food.proteinPer100 * factor * 10) / 10,
    carbsG: Math.round(food.carbsPer100 * factor * 10) / 10,
    fatG: Math.round(food.fatPer100 * factor * 10) / 10,
  };
}

export function getEquivalences(foodName: string, quantity: number, limit = 4) {
  const base = findFoodByName(foodName);
  if (!base || quantity <= 0) return { base: null, items: [] as Array<{ name: string; quantity: number; unit: string; kcal: number }> };

  const baseKcal = Math.max(1, Math.round(base.kcalPer100 * (quantity / 100)));
  const items = CATALOG
    .filter((f) => f.group === base.group && f.name !== base.name)
    .slice(0, limit)
    .map((f) => {
      const eqQty = Math.round((baseKcal / f.kcalPer100) * 100);
      return {
        name: f.name,
        quantity: eqQty,
        unit: f.unit,
        kcal: Math.round((f.kcalPer100 * eqQty) / 100),
      };
    });

  return { base: { ...base, kcal: baseKcal, quantity }, items };
}
