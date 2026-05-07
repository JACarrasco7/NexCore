import type {
  AppRoute,
  InfoItem,
  PriorityAthlete,
  QuickStat,
  TrainingSet,
} from "@/lib/types";

export const primaryRoutes: AppRoute[] = [
  {
    href: "/coach",
    label: "Dashboard",
    description: "Semaforos, revision semanal y priorizacion operativa.",
  },
  {
    href: "/coach/athletes",
    label: "Atletas",
    description: "Lista completa del equipo y perfiles individuales.",
  },
  {
    href: "/coach/import-lab",
    label: "Import CSV",
    description: "Importacion de rutinas desde CSV o pegado tabular.",
  },
  {
    href: "/athlete/onboarding",
    label: "Onboarding",
    description: "Alta guiada con contexto tecnico y operativo.",
  },
  {
    href: "/athlete/training-log",
    label: "Rutina",
    description: "Registro en tiempo real de carga, reps, RIR y descanso.",
  },
  {
    href: "/athlete/check-in",
    label: "Check-in",
    description: "Revision periódica estructurada y lista para decidir.",
  },
];

export const homePillars: AppRoute[] = [
  {
    href: "/athlete/training-log",
    label: "Rutina viva",
    description: "Series, carga, repeticiones, RIR, descanso y notas técnicas en una sola sesión activa.",
  },
  {
    href: "/athlete/check-in",
    label: "Check-in periódico",
    description: "Adherencia, sensaciones y contexto para revisión rápida del coach.",
  },
  {
    href: "/coach",
    label: "Dashboard coach",
    description: "Cola de revisión, alertas, atletas en riesgo y visión operativa del equipo.",
  },
];

export const roadmapItems = [
  "Onboarding guiado con ficha, movilidad y maquinaria",
  "Importación inteligente de rutinas desde Excel o CSV",
  "Alertas automáticas con IA sobre adherencia y riesgo",
  "Integraciones con Health Connect y Apple Health",
];

export const summaryStats: QuickStat[] = [
  {
    label: "Atletas activos",
    value: "34",
    detail: "+4 este mes",
    tone: "success",
  },
  {
    label: "Revisiones pendientes",
    value: "11",
    detail: "5 requieren accion hoy",
    tone: "warning",
  },
  {
    label: "Adherencia media",
    value: "87%",
    detail: "Estable vs semana anterior",
    tone: "success",
  },
];

export const coachStats: QuickStat[] = [
  { label: "Atletas activos", value: "34" },
  { label: "Alertas rojas", value: "3", tone: "danger" },
  { label: "Sin check-in", value: "5", tone: "warning" },
  { label: "Adherencia media", value: "87%", tone: "success" },
];

export const priorityAthletes: PriorityAthlete[] = [
  {
    name: "Adrian M.",
    status: "Riesgo",
    detail: "Fuerza -8% en press y 3 check-ins con sueno bajo.",
    tone: "danger",
  },
  {
    name: "Lucia R.",
    status: "Atencion",
    detail: "Peso fuera de rango objetivo y pasos 18% por debajo.",
    tone: "warning",
  },
  {
    name: "Mario T.",
    status: "Estable",
    detail: "Adherencia 94%, progreso de carga y fotos alineadas.",
    tone: "success",
  },
];

export const reviewQueue = [
  "11 check-ins pendientes de revisar antes de las 20:00",
  "4 atletas sin video de top set en la sesion pesada de hoy",
  "2 fases de definicion necesitan ajuste de macros para la semana 19",
  "1 Peak Week programada para activarse este viernes",
];

export const trainingSets: TrainingSet[] = [
  {
    exercise: "Press banca",
    previous: "82.5 kg x 8 · RIR 2",
    target: "83.5 kg x 8",
    rest: "02:30",
    load: "84 kg",
    reps: "8",
    rir: "1",
    video: "Top set adjunto",
  },
  {
    exercise: "Press inclinado mancuerna",
    previous: "34 kg x 10 · RIR 1",
    target: "34 kg x 11",
    rest: "02:00",
    load: "34 kg",
    reps: "11",
    rir: "1",
    video: "Serie tecnica subida",
  },
  {
    exercise: "Aperturas en polea",
    previous: "17.5 kg x 15 · RIR 2",
    target: "18 kg x 15",
    rest: "01:30",
    load: "18 kg",
    reps: "15",
    rir: "2",
    video: "No requerido",
  },
];

export const coachContext: string[] = [
  "Prioriza el estiramiento, no fuerces la velocidad en la parte baja.",
  "Si el RIR real cae a 0 antes de la ultima serie, corta una serie accesoria.",
  "IA futura: sugerencia automatica de carga segun series previas, RIR y fatiga acumulada.",
];

export const checkInMetrics: QuickStat[] = [
  { label: "Peso promedio", value: "79.4 kg", tone: "success" },
  { label: "Pasos medios", value: "11.840", tone: "success" },
  { label: "Adherencia dieta", value: "92%", tone: "success" },
  { label: "Sueno medio", value: "6 h 14 min", tone: "warning" },
];

export const checkInSignals: InfoItem[] = [
  { title: "Sensacion general", detail: "7/10" },
  { title: "Hambre", detail: "Moderada" },
  { title: "Estres", detail: "Controlado" },
  { title: "Cardio", detail: "Completado 5/5" },
];

export const checkInAttachments = [
  "Fotos de frente, espalda y perfil",
  "Peso diario de los ultimos 7 dias",
  "Promedio de pasos importado desde salud",
  "Comentario del atleta con contexto semanal",
];

export const onboardingSteps = [
  "Ficha inicial y objetivos",
  "Historial, lesiones y restricciones",
  "Habitos, horarios y disponibilidad",
  "Fotos iniciales y videos de movilidad",
  "Inventario de maquinaria del gimnasio",
  "Consentimiento y documentacion base",
];

export const onboardingOutputs = [
  "Perfil completo del atleta listo para programar.",
  "Contexto tecnico suficiente para adaptar rutina y seguimiento.",
  "Base de datos estructurada para IA, alertas e integraciones futuras.",
];
