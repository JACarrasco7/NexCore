'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiFetch } from '@/lib/store'

type CoachMe = { id: string; displayName: string }

export function useCoachMe(): { coach: CoachMe | null; loading: boolean } {
  const { data: session, status } = useSession()
  const [coach, setCoach] = useState<CoachMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      setLoading(false)
      return
    }
    apiFetch('/api/me/coach')
      .then((data: any) => {
        if (data) setCoach(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session, status])

  return { coach, loading }
}
