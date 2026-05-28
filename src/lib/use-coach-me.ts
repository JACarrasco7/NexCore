'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { coachKeys } from '@/lib/query-keys'
import { apiFetch } from '@/lib/store'

type CoachMe = { id: string; displayName: string }

export function useCoachMe(): { coach: CoachMe | null; loading: boolean } {
  const { data: session, status } = useSession()

  const { data: coach = null, isLoading: loading } = useQuery({
    queryKey: coachKeys.me(),
    queryFn: () => apiFetch<CoachMe>('/api/me/coach'),
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  })

  return { coach, loading: status === 'loading' || loading }
}
