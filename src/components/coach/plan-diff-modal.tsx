'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { PlanDiff } from '@/lib/plan-diff'

type PlanDiffModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  diff: PlanDiff
}

export function PlanDiffModal({ open, onClose, onConfirm, diff }: PlanDiffModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!isVisible) return null

  const hasChanges =
    diff.sessionsAdded > 0 ||
    diff.sessionsRemoved > 0 ||
    diff.sessionsModified > 0 ||
    diff.totalSetsBefore !== diff.totalSetsAfter

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comparación de cambios</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-foreground/80 mb-2 text-sm font-medium">Sesiones</h4>
            <div className="text-sm">
              <p>
                Añadidas: <span className="font-medium text-green-600">+{diff.sessionsAdded}</span>
              </p>
              <p>
                Eliminadas:{' '}
                <span className="font-medium text-red-600">-{diff.sessionsRemoved}</span>
              </p>
              <p>
                Modificadas: <span className="font-medium">{diff.sessionsModified}</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-foreground/80 mb-2 text-sm font-medium">Volumen total</h4>
            <div className="text-sm">
              <p>
                Antes: <span className="font-medium">{diff.totalSetsBefore} sets</span>
              </p>
              <p>
                Ahora: <span className="font-medium">{diff.totalSetsAfter} sets</span>
              </p>
              <p>
                Diferencia:{' '}
                <span
                  className={`font-medium ${diff.totalSetsAfter - diff.totalSetsBefore >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {diff.totalSetsAfter - diff.totalSetsBefore >= 0 ? '+' : ''}
                  {diff.totalSetsAfter - diff.totalSetsBefore} sets
                </span>
              </p>
            </div>
          </div>

          {diff.volumeByMuscle.length > 0 && (
            <div>
              <h4 className="text-foreground/80 mb-2 text-sm font-medium">Volumen por músculo</h4>
              <div className="max-h-40 overflow-y-auto text-sm">
                {diff.volumeByMuscle.map((v) => (
                  <div key={v.muscle} className="flex justify-between">
                    <span className="capitalize">{v.muscle}</span>
                    <span>
                      {v.before} → {v.after}
                      {v.diff !== 0 && (
                        <span className={v.diff > 0 ? 'text-green-600' : 'text-red-600'}>
                          {' '}
                          ({v.diff > 0 ? '+' : ''}
                          {v.diff})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-line bg-surface-strong rounded-xl border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!hasChanges}
            className="bg-accent rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirmar cambios
          </button>
        </div>
      </div>
    </div>
  )
}
