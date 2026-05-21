import * as rules from '@/lib/domain-rules/nutrition';

export const nutritionService = {
  createPlan: (input: Parameters<typeof rules.createNutritionPlan>[0], userId?: string) =>
    rules.createNutritionPlan(input, userId),

  updatePlan: (planId: string, payload: Parameters<typeof rules.updateNutritionPlan>[1], userId?: string) =>
    rules.updateNutritionPlan(planId, payload, userId),

  activatePlan: (planId: string, userId?: string) => rules.activateNutritionPlan(planId, userId),

  archivePlan: (planId: string, userId?: string) => rules.archiveNutritionPlan(planId, userId),

  duplicatePlan: (planId: string, targetAthleteId?: string, userId?: string) =>
    rules.duplicateNutritionPlan(planId, targetAthleteId, userId),
};

export type NutritionService = typeof nutritionService;
