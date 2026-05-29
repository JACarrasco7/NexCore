'use client'

import { useEffect, useState } from 'react'
import { getVideos, getAllRIRLogs, getAllPoseMetrics } from './local-db'

export function useSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const syncNow = async () => {
    setSyncing(true)
    try {
      const videos = await getVideos()
      const rirLogs = await getAllRIRLogs()
      const poseMetrics = await getAllPoseMetrics()

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos, rirLogs, poseMetrics }),
      })

      if (res.ok) {
        const data = await res.json()
        setLastSync(data.lastSync)
      }
    } catch (e) {
      console.error('Sync error:', e)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const handleOnline = () => syncNow()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return { syncing, lastSync, syncNow }
}
