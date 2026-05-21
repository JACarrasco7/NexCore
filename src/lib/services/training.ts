import * as rules from '@/lib/domain-rules/training';

export const trainingService = {
  createPlan: (input: Parameters<typeof rules.createPlan>[0], userId?: string) =>
    rules.createPlan(input, userId),

  updatePlan: (planId: string, payload: Parameters<typeof rules.updatePlan>[1], userId?: string) =>
    rules.updatePlan(planId, payload, userId),

  archivePlan: (planId: string, userId?: string) => rules.archivePlan(planId, userId),

  duplicatePlan: (planId: string, targetAthleteId?: string, userId?: string) =>
    rules.duplicatePlan(planId, targetAthleteId, userId),
};

export type TrainingService = typeof trainingService;
