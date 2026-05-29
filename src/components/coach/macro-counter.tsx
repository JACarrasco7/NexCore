'use client'

type MacroCounterProps = {
  current: { kcal: number; protein: number; carbs: number; fat: number }
  target?: { kcal?: number; protein?: number; carbs?: number; fat?: number }
}

export function MacroCounter({ current, target }: MacroCounterProps) {
  const pct = (value: number, targetValue?: number) => {
    if (!targetValue || targetValue === 0) return 0
    return Math.min(100, Math.round((value / targetValue) * 100))
  }

  const Bar = ({ label, current, target }: { label: string; current: number; target?: number }) => {
    const percentage = pct(current, target)
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-foreground/60 w-8">{label}</span>
        <div className="h-1.5 flex-1 rounded-full bg-gray-200">
          <div
            className="bg-accent h-1.5 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-foreground/60 w-12 text-right">
          {current}/{target ?? '-'}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1 rounded-lg bg-white p-2">
      <Bar label="Kcal" current={current.kcal} target={target?.kcal} />
      <Bar label="P" current={current.protein} target={target?.protein} />
      <Bar label="C" current={current.carbs} target={target?.carbs} />
      <Bar label="G" current={current.fat} target={target?.fat} />
    </div>
  )
}
