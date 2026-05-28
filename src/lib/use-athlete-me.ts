'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { athleteKeys } from '@/lib/query-keys'

type AthleteMe = {
  id: string
  fullName: string
  goal: string
  phaseLabel: string
  coachId: string
  latestWeightKg: number | null
}

export function useAthleteMe(): { athlete: AthleteMe | null; loading: boolean; notFound: boolean } {
  const { data: session, status } = useSession()

  const {
    data: athlete = null,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: athleteKeys.me(),
    queryFn: async () => {
      const r = await fetch('/api/me/athlete')
      if (r.status === 404) return null
      return r.json() as Promise<AthleteMe>
    },
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const notFound = status === 'authenticated' && !loading && athlete === null && !isError

  return {
    athlete,
    loading: status === 'loading' || loading,
    notFound,
  }
}
