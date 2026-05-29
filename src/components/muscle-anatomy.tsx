'use client'

import { getMuscleColor, getMuscleLabel } from '@/lib/muscle-anatomy'

interface MuscleAnatomyProps {
  primaryMuscle: string
  secondaryMuscles?: string[]
  size?: number
  className?: string
}

/**
 * SVG body diagram with highlighted muscles.
 * Shows a simplified front-view body with primary and secondary muscles colored.
 */
export function MuscleAnatomy({
  primaryMuscle,
  secondaryMuscles = [],
  size = 200,
  className = '',
}: MuscleAnatomyProps) {
  const primaryColor = getMuscleColor(primaryMuscle)
  const primaryLabel = getMuscleLabel(primaryMuscle)

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg viewBox="0 0 120 260" width={size} height={size * 2.17} className="drop-shadow-md">
        {/* Body outline */}
        <ellipse cx="60" cy="28" rx="18" ry="22" fill="none" stroke="#374151" strokeWidth="2.5" />
        <line x1="60" y1="50" x2="60" y2="140" stroke="#374151" strokeWidth="2.5" />
        {/* Arms */}
        <line x1="42" y1="70" x2="20" y2="130" stroke="#374151" strokeWidth="2.5" />
        <line x1="78" y1="70" x2="100" y2="130" stroke="#374151" strokeWidth="2.5" />
        {/* Legs */}
        <line x1="60" y1="140" x2="48" y2="240" stroke="#374151" strokeWidth="2.5" />
        <line x1="60" y1="140" x2="72" y2="240" stroke="#374151" strokeWidth="2.5" />

        {/* Primary muscle highlight */}
        <circle
          cx="60"
          cy="72"
          r="18"
          fill={primaryColor}
          fillOpacity="0.35"
          stroke={primaryColor}
          strokeWidth="2"
        />

        {/* Secondary muscle highlights */}
        {secondaryMuscles.map((m, i) => {
          const color = getMuscleColor(m)
          // Offset secondary circles
          const offsetX = (i % 2 === 0 ? -1 : 1) * 25
          const offsetY = 140 + Math.floor(i / 2) * 20
          return (
            <circle
              key={m}
              cx={60 + offsetX}
              cy={offsetY}
              r="10"
              fill={color}
              fillOpacity="0.3"
              stroke={color}
              strokeWidth="1.5"
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        {secondaryMuscles.map((m) => (
          <span
            key={m}
            className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: getMuscleColor(m) + '20', color: getMuscleColor(m) }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getMuscleColor(m) }} />
            {getMuscleLabel(m)}
          </span>
        ))}
      </div>
    </div>
  )
}
