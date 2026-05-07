import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line bg-surface px-6 py-10 text-center ${className}`.trim()}>
      {icon ? <div className="text-3xl">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? <p className="max-w-md text-sm text-foreground/55">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}