export type MobilitySeverity = "ok" | "warning" | "risk";

export type MobilityTestItem = {
  id: string;
  test: string;
  finding: string;
  implication: string;
  severity: MobilitySeverity;
};

export type RestrictionItem = {
  id: string;
  name: string;
  reason: string;
};

export type GymMachineItem = {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  muscleGroup?: string;
  imageUrl?: string;
  note?: string;
};

export type ObjectiveMuscleItem = {
  id: string;
  muscle: string;
  priority: "baja" | "media" | "alta";
  idealVolume: string;
  maxVolume: string;
};

export type AthleteContextProfileData = {
  mobilityTests: MobilityTestItem[];
  restrictedFoods: RestrictionItem[];
  restrictedExercises: RestrictionItem[];
  gymMachines: GymMachineItem[];
  objectiveMuscles: ObjectiveMuscleItem[];
  notes: string;
};

export const DEFAULT_ATHLETE_CONTEXT: AthleteContextProfileData = {
  mobilityTests: [
    {
      id: "heel-mobility",
      test: "Heel Mobility Test",
      finding: "Movilidad total y completa",
      implication: "Sin restricciones específicas por tobillo.",
      severity: "ok",
    },
    {
      id: "hip-hamstrings",
      test: "Hip Test and Hamstrings",
      finding: "Acortamiento de isquiosurales",
      implication: "Priorizar RDL controlado y evitar bisagra profunda desde el suelo.",
      severity: "warning",
    },
    {
      id: "faber",
      test: "Faber Test",
      finding: "Déficit de movilidad en aductores",
      implication: "Trabajo específico de cadera y progresión de rango.",
      severity: "warning",
    },
    {
      id: "squat",
      test: "Squat Test",
      finding: "Dominancia lumbar en paralelo",
      implication: "Priorizar variantes guiadas y progresar a libre por fases.",
      severity: "risk",
    },
  ],
  restrictedFoods: [],
  restrictedExercises: [],
  gymMachines: [],
  objectiveMuscles: [
    {
      id: "deltoides-medial",
      muscle: "Deltoides medial",
      priority: "alta",
      idealVolume: "6-10 series/sem",
      maxVolume: "12-16 series/sem",
    },
    {
      id: "pecho-clavicular",
      muscle: "Pecho (haz clavicular)",
      priority: "media",
      idealVolume: "4-8 series/sem",
      maxVolume: "10-14 series/sem",
    },
  ],
  notes: "",
};
