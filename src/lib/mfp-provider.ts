export type ExternalFoodItem = {
  name: string;
  unit: "g";
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  source: "MyFitnessPal";
};

type UnknownObj = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getByPath(obj: UnknownObj, path: string[]) {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as UnknownObj)[key];
  }
  return current;
}

function normalizeCandidate(item: UnknownObj): ExternalFoodItem | null {
  const name = String(
    item.name ?? item.food_name ?? item.description ?? item.title ?? ""
  ).trim();
  if (!name) return null;

  const kcalPer100 = toNumber(
    item.kcal_per_100g ??
      item.calories_per_100g ??
      getByPath(item, ["nutrition", "kcal_per_100g"]) ??
      getByPath(item, ["nutrition", "calories_per_100g"])
  );

  const proteinPer100 = toNumber(
    item.protein_per_100g ??
      getByPath(item, ["nutrition", "protein_per_100g"]) ??
      item.protein ??
      0
  );

  const carbsPer100 = toNumber(
    item.carbs_per_100g ??
      getByPath(item, ["nutrition", "carbs_per_100g"]) ??
      item.carbs ??
      0
  );

  const fatPer100 = toNumber(
    item.fat_per_100g ??
      getByPath(item, ["nutrition", "fat_per_100g"]) ??
      item.fat ??
      0
  );

  if (kcalPer100 <= 0) return null;

  return {
    name,
    unit: "g",
    kcalPer100,
    proteinPer100,
    carbsPer100,
    fatPer100,
    source: "MyFitnessPal",
  };
}

export function isMfpConfigured() {
  return Boolean(process.env.MFP_API_BASE_URL && process.env.MFP_API_KEY);
}

export async function searchMfpFoods(query: string): Promise<ExternalFoodItem[]> {
  const baseUrl = process.env.MFP_API_BASE_URL;
  const apiKey = process.env.MFP_API_KEY;
  const apiHost = process.env.MFP_API_HOST;

  if (!baseUrl || !apiKey || !query.trim()) return [];

  const url = `${baseUrl.replace(/\/$/, "")}/search?query=${encodeURIComponent(query)}&limit=12`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (apiHost) headers["x-rapidapi-host"] = apiHost;
  if (process.env.MFP_USE_RAPIDAPI === "true") headers["x-rapidapi-key"] = apiKey;

  const res = await fetch(url, { headers, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return [];

  const payload = (await res.json().catch(() => null)) as unknown;
  if (!payload) return [];

  const items = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as UnknownObj).items)
      ? ((payload as UnknownObj).items as unknown[])
      : Array.isArray((payload as UnknownObj).results)
        ? ((payload as UnknownObj).results as unknown[])
        : [];

  return items
    .map((x) => (typeof x === "object" && x ? normalizeCandidate(x as UnknownObj) : null))
    .filter((x): x is ExternalFoodItem => Boolean(x))
    .slice(0, 10);
}

export function macrosForExternalQuantity(item: ExternalFoodItem, quantity: number) {
  const factor = (quantity > 0 ? quantity : 100) / 100;
  return {
    kcal: Math.round(item.kcalPer100 * factor),
    proteinG: Math.round(item.proteinPer100 * factor * 10) / 10,
    carbsG: Math.round(item.carbsPer100 * factor * 10) / 10,
    fatG: Math.round(item.fatPer100 * factor * 10) / 10,
  };
}
