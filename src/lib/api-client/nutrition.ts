import { apiFetch, apiPost, apiPatch, apiDelete } from './base';
import type { NutritionPlan } from '@/lib/domain';

export interface NutritionPlanInput {
  athleteId: string;
  title: string;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string;
  meals?: Array<{
    name: string;
    time?: string;
    foods: Array<{ name: string; grams: number }>;
  }>;
}

export interface ListNutritionPlansOpts {
  athleteId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  skip?: number;
  take?: number;
}

export interface ListNutritionPlansResponse {
  items: NutritionPlan[];
  total: number;
}

/**
 * Nutrition plan client (typed API calls).
 */
export const nutritionPlansApi = {
  /**
   * List nutrition plans.
   */
  list: async (opts?: ListNutritionPlansOpts): Promise<ListNutritionPlansResponse> => {
    const params = new URLSearchParams();
    if (opts?.athleteId) params.set('athleteId', opts.athleteId);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.skip) params.set('skip', String(opts.skip));
    if (opts?.take) params.set('take', String(opts.take));

    const url = `/api/nutrition-plans${params.toString() ? '?' + params.toString() : ''}`;
    return apiFetch<ListNutritionPlansResponse>(url);
  },

  /**
   * Get single nutrition plan.
   */
  get: async (id: string): Promise<NutritionPlan> => {
    return apiFetch<NutritionPlan>(`/api/nutrition-plans/${id}`);
  },

  /**
   * Create nutrition plan.
   */
  create: async (input: NutritionPlanInput): Promise<NutritionPlan> => {
    return apiPost<NutritionPlan>('/api/nutrition-plans', input);
  },

  /**
   * Update nutrition plan.
   */
  update: async (id: string, data: Partial<NutritionPlanInput>): Promise<NutritionPlan> => {
    return apiPatch<NutritionPlan>(`/api/nutrition-plans/${id}`, data);
  },

  /**
   * Activate nutrition plan.
   */
  activate: async (id: string): Promise<NutritionPlan> => {
    return apiPost<NutritionPlan>(`/api/nutrition-plans/${id}/activate`, {});
  },

  /**
   * Archive nutrition plan.
   */
  archive: async (id: string): Promise<NutritionPlan> => {
    return apiPost<NutritionPlan>(`/api/nutrition-plans/${id}/archive`, {});
  },

  /**
   * Delete nutrition plan.
   */
  delete: async (id: string): Promise<{ ok: true }> => {
    return apiDelete(`/api/nutrition-plans/${id}`);
  },

  /**
   * Save as template.
   */
  saveAsTemplate: async (id: string, name: string): Promise<{ id: string }> => {
    return apiPost<{ id: string }>(`/api/nutrition-plans/${id}/save-as-template`, {
      name,
    });
  },
};
