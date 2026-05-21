import { apiFetch, apiPost, apiPatch, apiDelete } from './base';
import type { TrainingPlan, WorkoutSession, ExercisePrescription } from '@/lib/domain';

export interface PlanInput {
  athleteId: string;
  title: string;
  block: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  sessions: Omit<WorkoutSession, 'id' | 'planId'>[];
}

export interface ListPlansOpts {
  athleteId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  skip?: number;
  take?: number;
}

export interface ListPlansResponse {
  items: TrainingPlan[];
  total: number;
}

/**
 * Training plan client (typed API calls).
 */
export const trainingPlansApi = {
  /**
   * List plans (with optional filters).
   */
  list: async (opts?: ListPlansOpts): Promise<ListPlansResponse> => {
    const params = new URLSearchParams();
    if (opts?.athleteId) params.set('athleteId', opts.athleteId);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.skip) params.set('skip', String(opts.skip));
    if (opts?.take) params.set('take', String(opts.take));

    const url = `/api/plans${params.toString() ? '?' + params.toString() : ''}`;
    const data = await apiFetch<ListPlansResponse>(url);
    return data;
  },

  /**
   * Get single plan by ID.
   */
  get: async (id: string): Promise<TrainingPlan> => {
    return apiFetch<TrainingPlan>(`/api/plans/${id}`);
  },

  /**
   * Create new plan.
   */
  create: async (input: PlanInput): Promise<TrainingPlan> => {
    return apiPost<TrainingPlan>('/api/plans', input);
  },

  /**
   * Update plan (creates new version in future).
   */
  update: async (id: string, data: Partial<PlanInput>): Promise<TrainingPlan> => {
    return apiPatch<TrainingPlan>(`/api/plans/${id}`, data);
  },

  /**
   * Activate plan (archives others for same athlete).
   */
  activate: async (id: string): Promise<TrainingPlan> => {
    return apiPost<TrainingPlan>(`/api/plans/${id}/activate`, {});
  },

  /**
   * Archive plan.
   */
  archive: async (id: string): Promise<TrainingPlan> => {
    return apiPost<TrainingPlan>(`/api/plans/${id}/archive`, {});
  },

  /**
   * Duplicate plan (for creating variations).
   */
  duplicate: async (id: string, athleteId?: string): Promise<TrainingPlan> => {
    return apiPost<TrainingPlan>(`/api/plans/${id}/duplicate`, { athleteId });
  },

  /**
   * Save plan as template for reuse.
   */
  saveAsTemplate: async (id: string, name: string): Promise<{ id: string }> => {
    return apiPost<{ id: string }>(`/api/plans/${id}/save-as-template`, { name });
  },

  /**
   * Delete plan (soft delete with deletedAt).
   */
  delete: async (id: string): Promise<{ ok: true }> => {
    return apiDelete(`/api/plans/${id}`);
  },
};
