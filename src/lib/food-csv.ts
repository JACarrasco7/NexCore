export type CsvFoodRow = {
  mealName: string;
  mealTime: string;
  food: string;
  quantity: number;
  unit: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type CsvColumnMap = {
  mealName?: string;
  mealTime?: string;
  food?: string;
  quantity?: string;
  unit?: string;
  kcal?: string;
  proteinG?: string;
  carbsG?: string;
  fatG?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function detectDelimiter(line: string): string {
  const delimiters = [",", ";", "\t", "|"];
  const scored = delimiters.map((d) => ({ delimiter: d, count: line.split(d).length }));
  scored.sort((a, b) => b.count - a.count);
  return scored[0]?.delimiter ?? ",";
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function indexByHeader(headers: string[]) {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[normalize(h)] = i;
  });
  return map;
}

function readCell(cells: string[], headerMap: Record<string, number>, candidates: string[]) {
  for (const c of candidates) {
    const idx = headerMap[normalize(c)];
    if (idx !== undefined && cells[idx] !== undefined) {
      return cells[idx];
    }
  }
  return "";
}

export function getNutritionCsvHeaders(text: string): { headers: string[]; delimiter: string } {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return { headers: [], delimiter: "," };

  const delimiter = detectDelimiter(rawLines[0]);
  const headers = parseDelimitedLine(rawLines[0], delimiter);
  return { headers, delimiter };
}

export function suggestNutritionColumnMap(headers: string[]): CsvColumnMap {
  const headerMap = indexByHeader(headers);
  const resolve = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = headerMap[normalize(c)];
      if (idx !== undefined) return headers[idx];
    }
    return undefined;
  };

  return {
    mealName: resolve(["meal", "comida", "mealname", "meal name"]),
    mealTime: resolve(["time", "hora", "meal time"]),
    food: resolve(["food", "alimento", "item", "nombre"]),
    quantity: resolve(["quantity", "cantidad", "grams", "g"]),
    unit: resolve(["unit", "unidad"]),
    kcal: resolve(["kcal", "calorias", "calories"]),
    proteinG: resolve(["proteina", "protein", "p"]),
    carbsG: resolve(["carbos", "carbs", "hidratos", "c"]),
    fatG: resolve(["grasas", "fat", "g"]),
  };
}

export function parseNutritionCsvWithMap(
  text: string,
  columnMap: CsvColumnMap,
  delimiter?: string
): CsvFoodRow[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length < 2) return [];

  const resolvedDelimiter = delimiter ?? detectDelimiter(rawLines[0]);
  const headers = parseDelimitedLine(rawLines[0], resolvedDelimiter);
  const headerMap = indexByHeader(headers);

  const mapped = {
    mealName: columnMap.mealName ?? "meal",
    mealTime: columnMap.mealTime ?? "time",
    food: columnMap.food ?? "food",
    quantity: columnMap.quantity ?? "quantity",
    unit: columnMap.unit ?? "unit",
    kcal: columnMap.kcal ?? "kcal",
    proteinG: columnMap.proteinG ?? "protein",
    carbsG: columnMap.carbsG ?? "carbs",
    fatG: columnMap.fatG ?? "fat",
  };

  const rows: CsvFoodRow[] = [];

  for (let i = 1; i < rawLines.length; i += 1) {
    const cells = parseDelimitedLine(rawLines[i], resolvedDelimiter);

    const food = readCell(cells, headerMap, [mapped.food]);
    if (!food) continue;

    const mealName = readCell(cells, headerMap, [mapped.mealName]) || "Comida";
    const mealTime = readCell(cells, headerMap, [mapped.mealTime]);
    const quantity = toNumber(readCell(cells, headerMap, [mapped.quantity])) ?? 100;
    const unit = readCell(cells, headerMap, [mapped.unit]) || "g";

    rows.push({
      mealName,
      mealTime,
      food,
      quantity,
      unit,
      kcal: toNumber(readCell(cells, headerMap, [mapped.kcal])),
      proteinG: toNumber(readCell(cells, headerMap, [mapped.proteinG])),
      carbsG: toNumber(readCell(cells, headerMap, [mapped.carbsG])),
      fatG: toNumber(readCell(cells, headerMap, [mapped.fatG])),
    });
  }

  return rows;
}

export function parseNutritionCsv(text: string): CsvFoodRow[] {
  const { headers, delimiter } = getNutritionCsvHeaders(text);
  const suggestion = suggestNutritionColumnMap(headers);
  return parseNutritionCsvWithMap(text, suggestion, delimiter);
}
