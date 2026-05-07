export type AppRoute = {
  href: string;
  label: string;
  description: string;
};

export type QuickStat = {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type PriorityAthlete = {
  name: string;
  status: string;
  detail: string;
  tone: "success" | "warning" | "danger";
};

export type TrainingSet = {
  exercise: string;
  previous: string;
  target: string;
  rest: string;
  load: string;
  reps: string;
  rir: string;
  video: string;
};

export type InfoItem = {
  title: string;
  detail?: string;
};
