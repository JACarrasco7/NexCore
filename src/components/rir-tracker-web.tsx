'use client'

import { useState } from 'react'

interface RIRTrackerWebProps {
  videoId: string
}

export default function RIRTrackerWeb({ videoId }: RIRTrackerWebProps) {
  const [setNumber, setSetNumber] = useState(1)
  const [reps, setReps] = useState(0)
  const [rir, setRir] = useState(0)
  const [saving, setSaving] = useState(false)

  const saveLog = async () => {
    setSaving(true)
    try {
      await fetch(`/api/videos/${videoId}/rir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_number: setNumber, reps, rir }),
      })
      setSetNumber(setNumber + 1)
      setReps(0)
      setRir(0)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <h3 className="mb-2 font-bold">Serie {setNumber}</h3>
      <div className="mb-2 flex gap-2">
        <input
          type="number"
          placeholder="Repeticiones"
          value={reps}
          onChange={(e) => setReps(parseInt(e.target.value) || 0)}
          className="flex-1 rounded border p-2"
        />
        <input
          type="number"
          placeholder="RIR (0-10)"
          value={rir}
          onChange={(e) => setRir(parseFloat(e.target.value) || 0)}
          className="flex-1 rounded border p-2"
        />
      </div>
      <button
        onClick={saveLog}
        disabled={saving}
        className="w-full rounded bg-blue-600 py-2 text-white"
      >
        {saving ? 'Guardando...' : 'Guardar serie'}
      </button>
    </div>
  )
}
