'use client'

import { useCallback, useEffect, useState } from 'react'
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

  // Normalize common wrapper shapes: array, { items: [] }, { athletes: [] }, etc.
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
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = coachId ? `/api/athletes?coachId=${coachId}` : '/api/athletes'
    apiFetch<any>(url)
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items ?? data?.athletes ?? [])
        setAthletes(items as AthleteProfile[])
      })
      .catch((err) => {
        console.error(err)
        setAthletes([])
      })
      .finally(() => setLoading(false))
  }, [coachId])

  const addAthlete = useCallback(
    async (athlete: Omit<AthleteProfile, 'id'> & { id?: string; coachId?: string }) => {
      const created = await apiPost<AthleteProfile>('/api/athletes', athlete)
      setAthletes((prev) => [...prev, created])
      return created
    },
    []
  )

  const removeAthlete = useCallback(async (id: string) => {
    await fetch(`/api/athletes/${id}`, { method: 'DELETE' })
    setAthletes((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const updateAthlete = useCallback(async (id: string, data: Partial<AthleteProfile>) => {
    const res = await fetch(`/api/athletes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`PATCH /api/athletes/${id} -> ${res.status}`)
    const updated: AthleteProfile = await res.json()
    setAthletes((prev) => prev.map((a) => (a.id === id ? updated : a)))
    return updated
  }, [])

  return { athletes, loading, addAthlete, removeAthlete, updateAthlete }
}

// ---------------------------------------------------------------------------

export function useCheckIns(athleteId?: string) {
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = athleteId ? `/api/check-ins?athleteId=${athleteId}` : '/api/check-ins'
    apiFetch<CheckInEntry[]>(url)
      .then(setCheckIns)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [athleteId])

  const addCheckIn = useCallback(async (entry: CheckInEntry) => {
    const created = await apiPost<CheckInEntry>('/api/check-ins', entry)
    setCheckIns((prev) => [...prev, created])
    return created
  }, [])

  return { checkIns, loading, addCheckIn }
}

// ---------------------------------------------------------------------------

export function useDailyLogs(athleteId?: string) {
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = athleteId ? `/api/daily-logs?athleteId=${athleteId}` : '/api/daily-logs'
    apiFetch<DailyLogEntry[]>(url)
      .then(setDailyLogs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [athleteId])

  const addDailyLog = useCallback(async (entry: DailyLogEntry) => {
    const created = await apiPost<DailyLogEntry>('/api/daily-logs', entry)
    setDailyLogs((prev) => [...prev, created])
    return created
  }, [])

  return { dailyLogs, loading, addDailyLog }
}

// ---------------------------------------------------------------------------

export function useTrainingPlans(athleteId?: string) {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!athleteId) {
      setPlans([])
      setLoading(false)
      return
    }

    const url = `/api/plans?athleteId=${athleteId}`
    apiFetch<TrainingPlan[]>(url)
      .then(setPlans)
      .catch((err) => {
        console.error(err)
        setPlans([])
      })
      .finally(() => setLoading(false))
  }, [athleteId])

  const addPlan = useCallback(async (plan: TrainingPlan) => {
    const created = await apiPost<TrainingPlan>('/api/plans', plan)
    setPlans((prev) => [...prev, created])
    return created
  }, [])

  return { plans, loading, addPlan }
}

// ---------------------------------------------------------------------------

export function useSessionLogs(athleteId?: string) {
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = athleteId ? `/api/session-logs?athleteId=${athleteId}` : '/api/session-logs'
    apiFetch<SessionLog[]>(url)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [athleteId])

  const addSessionLog = useCallback(async (log: SessionLog) => {
    const created = await apiPost<SessionLog>('/api/session-logs', log)
    setLogs((prev) => [...prev, created])
    return created
  }, [])

  return { logs, loading, addSessionLog }
}

// ---------------------------------------------------------------------------

export function useNutritionPlans(athleteId?: string) {
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlans = useCallback(async () => {
    const url = athleteId ? `/api/nutrition-plans?athleteId=${athleteId}` : '/api/nutrition-plans'
    const data = await apiFetch<NutritionPlan[]>(url).catch(() => [])
    setPlans(data)
    setLoading(false)
  }, [athleteId])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const activePlan = plans.find((p) => p.isActive) ?? plans[0] ?? null

  return { plans, activePlan, loading, refresh: fetchPlans }
}

export function useServicePlans() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlans = useCallback(async () => {
    const data = await apiFetch<ServicePlan[]>('/api/service-plans').catch(() => [])
    setPlans(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const addPlan = useCallback(
    async (data: Omit<ServicePlan, 'id' | 'coachId' | 'createdAt' | '_count'>) => {
      const created = await apiPost<ServicePlan>('/api/service-plans', data)
      setPlans((prev) => [...prev, created])
      return created
    },
    []
  )

  const removePlan = useCallback(async (id: string) => {
    await fetch(`/api/service-plans/${id}`, { method: 'DELETE' })
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { plans, loading, addPlan, removePlan, refresh: fetchPlans }
}
