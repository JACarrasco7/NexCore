'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  athleteKeys,
  checkInKeys,
  dailyLogKeys,
  trainingPlanKeys,
  sessionLogKeys,
  nutritionPlanKeys,
  servicePlanKeys,
} from '@/lib/query-keys'
import type {
  AthleteProfile,
  CheckInEntry,
  DailyLogEntry,
  NutritionPlan,
  ServicePlan,
  SessionLog,
  TrainingPlan,
} from '@/lib/domain'

export async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${url} -> ${res.status}`)
  const data = await res.json()

  if (Array.isArray(data)) return data as T
  if (data && typeof data === 'object') {
    const anyData = data as Record<string, unknown>
    if (Array.isArray(anyData.items)) return anyData.items as T
    if (Array.isArray(anyData.results)) return anyData.results as T
    if (Array.isArray(anyData.athletes)) return anyData.athletes as T
    if (Array.isArray(anyData.plans)) return anyData.plans as T
  }

  return data as T
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API POST ${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

export type { CheckInEntry, SessionLog }

// ---------------------------------------------------------------------------

export function useAthletes(coachId?: string) {
  const queryClient = useQueryClient()

  const { data: athletes = [], isLoading: loading } = useQuery({
    queryKey: athleteKeys.list({ coachId }),
    queryFn: async () => {
      const url = coachId ? `/api/athletes?coachId=${coachId}` : '/api/athletes'
      const data = await apiFetch<any>(url)
      const items = Array.isArray(data) ? data : (data?.items ?? data?.athletes ?? [])
      return items as AthleteProfile[]
    },
  })

  const addAthlete = useCallback(
    async (athlete: Omit<AthleteProfile, 'id'> & { id?: string; coachId?: string }) => {
      const created = await apiPost<AthleteProfile>('/api/athletes', athlete)
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      return created
    },
    [queryClient]
  )

  const removeAthlete = useCallback(
    async (id: string) => {
      await fetch(`/api/athletes/${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
    },
    [queryClient]
  )

  const updateAthlete = useCallback(
    async (id: string, data: Partial<AthleteProfile>) => {
      const res = await fetch(`/api/athletes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`PATCH /api/athletes/${id} -> ${res.status}`)
      const updated: AthleteProfile = await res.json()
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      return updated
    },
    [queryClient]
  )

  return { athletes, loading, addAthlete, removeAthlete, updateAthlete }
}

// ---------------------------------------------------------------------------

export function useCheckIns(athleteId?: string) {
  const queryClient = useQueryClient()

  const { data: checkIns = [], isLoading: loading } = useQuery({
    queryKey: checkInKeys.list(athleteId),
    queryFn: async () => {
      const url = athleteId ? `/api/check-ins?athleteId=${athleteId}` : '/api/check-ins'
      return apiFetch<CheckInEntry[]>(url)
    },
  })

  const addCheckIn = useCallback(
    async (entry: CheckInEntry) => {
      const created = await apiPost<CheckInEntry>('/api/check-ins', entry)
      queryClient.invalidateQueries({ queryKey: checkInKeys.all })
      return created
    },
    [queryClient]
  )

  return { checkIns, loading, addCheckIn }
}

// ---------------------------------------------------------------------------

export function useDailyLogs(athleteId?: string) {
  const queryClient = useQueryClient()

  const { data: dailyLogs = [], isLoading: loading } = useQuery({
    queryKey: dailyLogKeys.list(athleteId),
    queryFn: async () => {
      const url = athleteId ? `/api/daily-logs?athleteId=${athleteId}` : '/api/daily-logs'
      return apiFetch<DailyLogEntry[]>(url)
    },
  })

  const addDailyLog = useCallback(
    async (entry: DailyLogEntry) => {
      const created = await apiPost<DailyLogEntry>('/api/daily-logs', entry)
      queryClient.invalidateQueries({ queryKey: dailyLogKeys.all })
      return created
    },
    [queryClient]
  )

  return { dailyLogs, loading, addDailyLog }
}

// ---------------------------------------------------------------------------

export function useTrainingPlans(athleteId?: string) {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: trainingPlanKeys.list(athleteId),
    queryFn: async () => {
      if (!athleteId) return [] as TrainingPlan[]
      return apiFetch<TrainingPlan[]>(`/api/plans?athleteId=${athleteId}`)
    },
    enabled: !!athleteId,
  })

  const addPlan = useCallback(
    async (plan: TrainingPlan) => {
      const created = await apiPost<TrainingPlan>('/api/plans', plan)
      queryClient.invalidateQueries({ queryKey: trainingPlanKeys.all })
      return created
    },
    [queryClient]
  )

  return { plans, loading, addPlan }
}

// ---------------------------------------------------------------------------

export function useSessionLogs(athleteId?: string) {
  const queryClient = useQueryClient()

  const { data: logs = [], isLoading: loading } = useQuery({
    queryKey: sessionLogKeys.list(athleteId),
    queryFn: async () => {
      const url = athleteId ? `/api/session-logs?athleteId=${athleteId}` : '/api/session-logs'
      return apiFetch<SessionLog[]>(url)
    },
  })

  const addSessionLog = useCallback(
    async (log: SessionLog) => {
      const created = await apiPost<SessionLog>('/api/session-logs', log)
      queryClient.invalidateQueries({ queryKey: sessionLogKeys.all })
      return created
    },
    [queryClient]
  )

  const toggleSessionCompletion = useCallback(
    async (sessionId: string, done: boolean) => {
      await apiPost(`/api/session-logs/toggle`, { sessionId, completed: done }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: sessionLogKeys.all })
    },
    [queryClient]
  )

  return { logs, loading, addSessionLog, toggleSessionCompletion }
}

// ---------------------------------------------------------------------------

export function useNutritionPlans(athleteId?: string) {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: nutritionPlanKeys.list(athleteId),
    queryFn: async () => {
      const url = athleteId ? `/api/nutrition-plans?athleteId=${athleteId}` : '/api/nutrition-plans'
      return apiFetch<NutritionPlan[]>(url).catch(() => [] as NutritionPlan[])
    },
  })

  const activePlan = plans.find((p) => p.isActive) ?? plans[0] ?? null

  const addFoodToMeal = useCallback(
    async (
      planId: string,
      mealId: string,
      food: {
        food: string
        quantity?: number
        unit?: string
        kcal?: number
        proteinG?: number
        carbsG?: number
        fatG?: number
      }
    ) => {
      const created = await apiPost(`/api/nutrition-plans/${planId}/meals/${mealId}/foods`, food)
      queryClient.invalidateQueries({ queryKey: nutritionPlanKeys.all })
      return created
    },
    [queryClient]
  )

  return {
    plans,
    activePlan,
    loading,
    refresh: () => queryClient.invalidateQueries({ queryKey: nutritionPlanKeys.all }),
    addFoodToMeal,
  }
}

export function useServicePlans() {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: servicePlanKeys.list(),
    queryFn: () => apiFetch<ServicePlan[]>('/api/service-plans').catch(() => [] as ServicePlan[]),
  })

  const addPlan = useCallback(
    async (data: Omit<ServicePlan, 'id' | 'coachId' | 'createdAt' | '_count'>) => {
      const created = await apiPost<ServicePlan>('/api/service-plans', data)
      queryClient.invalidateQueries({ queryKey: servicePlanKeys.all })
      return created
    },
    [queryClient]
  )

  const removePlan = useCallback(
    async (id: string) => {
      await fetch(`/api/service-plans/${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: servicePlanKeys.all })
    },
    [queryClient]
  )

  return {
    plans,
    loading,
    addPlan,
    removePlan,
    refresh: () => queryClient.invalidateQueries({ queryKey: servicePlanKeys.all }),
  }
}
