import type { ExercisePrescription, TrainingPlan, WorkoutSession } from "@/lib/domain";

type ParsedRow = Record<string, string>;

export type ImportedPlanResult = {
  detectedDelimiter: "," | ";" | "tab";
  headers: string[];
  rows: ParsedRow[];
  plan: TrainingPlan;
};

const headerAliases: Record<string, string[]> = {
  session:          ["session", "sesion", "día", "dia", "workout"],
  exercise:         ["exercise", "ejercicio"],
  sets:             ["sets", "series"],
  reps:             ["reps", "repeticiones", "reps/objetivo"],
  rir:              ["rir", "target rir", "rir objetivo"],
  rest:             ["rest", "descanso", "descanso_s"],
  notes:            ["notes", "notas", "comentarios"],
  technique:        ["tecnica", "técnica", "technique", "metodo", "método"],
  technique_detail: ["tecnica_detalle", "technique_detail", "detalle_tecnica"],
  load_kg:          ["carga", "carga_kg", "load_kg", "load", "peso_kg"],
  load_note:        ["carga_nota", "load_note", "rm", "intensidad"],
  tempo_ecc:        ["tempo_exc", "tempo_ecc", "excentrico", "excéntrico"],
  tempo_pause:      ["tempo_pausa", "tempo_pause", "pausa"],
  tempo_conc:       ["tempo_conc", "concentrico", "concéntrico"],
  coach_cue:        ["cue", "indicacion", "indicación", "coach_cue", "tecnica_verbal"],
  progression_note: ["progresion", "progresión", "progression", "criterio_progresion"],
  video_url:        ["video", "video_url", "referencia"],
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function detectDelimiter(input: string): "," | ";" | "tab" {
  const firstLine = input.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";

  if (firstLine.includes("\t")) {
    return "tab";
  }

  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  return semicolons > commas ? ";" : ",";
}

function splitLine(line: string, delimiter: "," | ";" | "tab") {
  if (delimiter === "tab") {
    return line.split("\t");
  }

  return line.split(delimiter);
}

function resolveCanonicalKey(header: string) {
  const normalized = normalizeHeader(header);

  for (const [key, aliases] of Object.entries(headerAliases)) {
    if (aliases.includes(normalized)) {
      return key;
    }
  }

  return normalized;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toExercise(row: ParsedRow): ExercisePrescription {
  const tempoEcc   = row.tempo_ecc   ? toNumber(row.tempo_ecc, 0)   : undefined;
  const tempoPause = row.tempo_pause ? toNumber(row.tempo_pause, 0) : undefined;
  const tempoConc  = row.tempo_conc  ? toNumber(row.tempo_conc, 0)  : undefined;

  return {
    exercise:        row.exercise || "Ejercicio sin nombre",
    sets:            toNumber(row.sets || "", 3),
    reps:            row.reps || "8-12",
    targetRir:       row.rir || undefined,
    restSeconds:     row.rest ? toNumber(row.rest, 90) : undefined,
    notes:           row.notes || undefined,
    technique:       row.technique || undefined,
    techniqueDetail: row.technique_detail || undefined,
    loadKg:          row.load_kg ? toNumber(row.load_kg, 0) : undefined,
    loadNote:        row.load_note || undefined,
    tempoEcc:        tempoEcc && tempoEcc > 0 ? tempoEcc : undefined,
    tempoPause:      tempoPause && tempoPause > 0 ? tempoPause : undefined,
    tempoConc:       tempoConc && tempoConc > 0 ? tempoConc : undefined,
    coachCue:        row.coach_cue || undefined,
    progressionNote: row.progression_note || undefined,
    videoUrl:        row.video_url || undefined,
  };
}

function groupRowsIntoSessions(rows: ParsedRow[]): WorkoutSession[] {
  const grouped = new Map<string, ExercisePrescription[]>();

  for (const row of rows) {
    const sessionName = row.session || "Sesion principal";
    const current = grouped.get(sessionName) ?? [];
    current.push(toExercise(row));
    grouped.set(sessionName, current);
  }

  return Array.from(grouped.entries()).map(([sessionName, exercises], index) => ({
    id: `session-${index + 1}`,
    name: sessionName,
    block: "Bloque importado",
    exercises,
  }));
}

export function importDelimitedTrainingPlan(input: string): ImportedPlanResult {
  const delimiter = detectDelimiter(input);
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Se necesitan cabeceras y al menos una fila para importar un plan.");
  }

  const headers = splitLine(lines[0], delimiter).map((header) => header.trim());
  const canonicalHeaders = headers.map(resolveCanonicalKey);

  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line, delimiter).map((value) => value.trim());
    return canonicalHeaders.reduce<ParsedRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
  });

  const sessions = groupRowsIntoSessions(rows);

  return {
    detectedDelimiter: delimiter,
    headers,
    rows,
    plan: {
      id: "imported-plan-demo",
      athleteId: "athlete-demo",
      title: "Plan importado",
      weekLabel: "Semana importada",
      sessions,
    },
  };
}
