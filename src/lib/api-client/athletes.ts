import { apiFetch, apiPost, apiPatch, apiDelete } from './base';
import type { AthleteProfile } from '@/lib/domain';

export interface AthleteInput {
  name: string;
  email: string;
  birthdate?: string;
  sex?: 'M' | 'F' | 'O';
  heightCm?: number;
  coachId?: string;
  notes?: string;
}

export interface ListAthletesOpts {
  coachId?: string;
  teamId?: string;
  status?: 'INVITED' | 'ACTIVE' | 'PAUSED' | 'LEFT';
  skip?: number;
  take?: number;
}

export interface ListAthletesResponse {
  items: AthleteProfile[];
  total: number;
}

/**
 * Athletes client (typed API calls).
 */
export const athletesApi = {
  /**
   * List athletes (coach's or team's).
   */
  list: async (opts?: ListAthletesOpts): Promise<ListAthletesResponse> => {
    const params = new URLSearchParams();
    if (opts?.coachId) params.set('coachId', opts.coachId);
    if (opts?.teamId) params.set('teamId', opts.teamId);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.skip) params.set('skip', String(opts.skip));
    if (opts?.take) params.set('take', String(opts.take));

    const url = `/api/athletes${params.toString() ? '?' + params.toString() : ''}`;
    return apiFetch<ListAthletesResponse>(url);
  },

  /**
   * Get single athlete.
   */
  get: async (id: string): Promise<AthleteProfile> => {
    return apiFetch<AthleteProfile>(`/api/athletes/${id}`);
  },

  /**
   * Create new athlete.
   */
  create: async (input: AthleteInput): Promise<AthleteProfile> => {
    return apiPost<AthleteProfile>('/api/athletes', input);
  },

  /**
   * Update athlete.
   */
  update: async (id: string, data: Partial<AthleteInput>): Promise<AthleteProfile> => {
    return apiPatch<AthleteProfile>(`/api/athletes/${id}`, data);
  },

  /**
   * Assign coach to athlete.
   */
  assignCoach: async (
    id: string,
    coachId: string
  ): Promise<AthleteProfile> => {
    return apiPatch<AthleteProfile>(`/api/athletes/${id}`, { coachId });
  },

  /**
   * Remove athlete (soft delete).
   */
  delete: async (id: string): Promise<{ ok: true }> => {
    return apiDelete(`/api/athletes/${id}`);
  },

  /**
   * Get current authenticated athlete.
   */
  me: async (): Promise<AthleteProfile> => {
    return apiFetch<AthleteProfile>('/api/me/athlete');
  },

  /**
   * Compare multiple athletes (for analytics).
   */
  compare: async (athleteIds: string[]): Promise<any> => {
    return apiPost('/api/athletes/compare', { athleteIds });
  },
};
