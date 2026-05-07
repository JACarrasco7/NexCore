import type { QuickStat } from "@/lib/types";

const toneClasses: Record<NonNullable<QuickStat["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const toneBorderClasses: Record<NonNullable<QuickStat["tone"]>, string> = {
  default: "border-line",
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
};

const toneBgClasses: Record<NonNullable<QuickStat["tone"]>, string> = {
  default: "",
  success: "bg-success/5",
  warning: "bg-warning/5",
  danger: "bg-danger/5",
};

type StatCardProps = {
  stat: QuickStat;
};

export function StatCard({ stat }: StatCardProps) {
  const tone = stat.tone ?? "default";

  return (
    <article className={`h-full rounded-3xl border ${toneBorderClasses[tone]} ${toneBgClasses[tone]} bg-surface p-5 xl:p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] transition`}>
      <p className="text-xs xl:text-sm font-medium uppercase tracking-[0.18em] text-foreground/45">{stat.label}</p>
      <p className={`mt-3 text-4xl xl:text-5xl font-bold tabular-nums tracking-tight ${toneClasses[tone]}`}>{stat.value}</p>
      {stat.detail ? (
        <p className={`mt-1.5 text-sm xl:text-base ${toneClasses[tone]} opacity-75`}>{stat.detail}</p>
      ) : null}
    </article>
  );
}
