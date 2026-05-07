export const TAB_KEYS = ["summary", "training", "recovery", "nutrition", "body"] as const;
export const WIDGET_KEYS = [
  "overview",
  "quick-actions",
  "recent-checkin",
  "training-volume",
  "recent-sessions",
  "sleep-trend",
  "steps-trend",
  "nutrition-today",
  "nutrition-week",
  "body-metrics",
  "weight-trend",
  "adherence-trend",
  "macro-trend",
  "correlation-sleep-training",
] as const;

export type TabKey = (typeof TAB_KEYS)[number];
export type WidgetKey = (typeof WIDGET_KEYS)[number];

export type LayoutState = {
  activeTab: TabKey;
  hidden: WidgetKey[];
  order: Record<TabKey, WidgetKey[]>;
};

export const TAB_META: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "summary", label: "Resumen", description: "Prioridades de hoy y vista general" },
  { key: "training", label: "Entrenamiento", description: "Carga, sesiones y consistencia" },
  { key: "recovery", label: "Recuperacion", description: "Sueno, pasos y adherencia" },
  { key: "nutrition", label: "Nutricion", description: "Ingesta reciente y registro" },
  { key: "body", label: "Progreso", description: "Peso, cintura y composicion" },
];

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  overview: "Snapshot",
  "quick-actions": "Acciones rapidas",
  "recent-checkin": "Ultimo check-in",
  "training-volume": "Carga semanal",
  "recent-sessions": "Ultimas sesiones",
  "sleep-trend": "Sueno 7 dias",
  "steps-trend": "Pasos 7 dias",
  "nutrition-today": "Nutricion de hoy",
  "nutrition-week": "Promedio nutricional",
  "body-metrics": "Composicion corporal",
  "weight-trend": "Peso reciente",
  "adherence-trend": "Tendencia de adherencia",
  "macro-trend": "Tendencia de macros",
  "correlation-sleep-training": "Sueno vs entrenamiento",
};

export const DEFAULT_LAYOUT: LayoutState = {
  activeTab: "summary",
  hidden: [],
  order: {
    summary: ["overview", "quick-actions", "recent-checkin", "adherence-trend", "weight-trend"],
    training: ["training-volume", "recent-sessions", "correlation-sleep-training", "weight-trend"],
    recovery: ["sleep-trend", "steps-trend", "recent-checkin", "correlation-sleep-training"],
    nutrition: ["nutrition-today", "nutrition-week", "macro-trend", "quick-actions"],
    body: ["body-metrics", "weight-trend", "adherence-trend", "recent-checkin"],
  },
};

function isTabKey(value: unknown): value is TabKey {
  return typeof value === "string" && TAB_KEYS.includes(value as TabKey);
}

function isWidgetKey(value: unknown): value is WidgetKey {
  return typeof value === "string" && WIDGET_KEYS.includes(value as WidgetKey);
}

function dedupeWidgets(items: unknown[], fallback: WidgetKey[]) {
  const filtered = items.filter(isWidgetKey);
  return Array.from(new Set([...filtered, ...fallback]));
}

export function sanitizeLayout(input: unknown): LayoutState {
  const current = typeof input === "object" && input !== null ? (input as Partial<LayoutState>) : {};
  const orderInput = typeof current.order === "object" && current.order !== null ? current.order : {};

  return {
    activeTab: isTabKey(current.activeTab) ? current.activeTab : DEFAULT_LAYOUT.activeTab,
    hidden: Array.isArray(current.hidden) ? Array.from(new Set(current.hidden.filter(isWidgetKey))) : [],
    order: {
      summary: dedupeWidgets(Array.isArray((orderInput as Record<string, unknown>).summary) ? (orderInput as Record<string, unknown[]>).summary : [], DEFAULT_LAYOUT.order.summary),
      training: dedupeWidgets(Array.isArray((orderInput as Record<string, unknown>).training) ? (orderInput as Record<string, unknown[]>).training : [], DEFAULT_LAYOUT.order.training),
      recovery: dedupeWidgets(Array.isArray((orderInput as Record<string, unknown>).recovery) ? (orderInput as Record<string, unknown[]>).recovery : [], DEFAULT_LAYOUT.order.recovery),
      nutrition: dedupeWidgets(Array.isArray((orderInput as Record<string, unknown>).nutrition) ? (orderInput as Record<string, unknown[]>).nutrition : [], DEFAULT_LAYOUT.order.nutrition),
      body: dedupeWidgets(Array.isArray((orderInput as Record<string, unknown>).body) ? (orderInput as Record<string, unknown[]>).body : [], DEFAULT_LAYOUT.order.body),
    },
  };
}
