"use client";

import type { ReactNode } from "react";

type Density = "compact" | "default" | "comfortable";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  density?: Density;
  className?: string;
}

const PADDING: Record<Density, string> = {
  compact: "p-4",
  default: "p-5",
  comfortable: "p-6",
};

/**
 * Standard card container used throughout coach and athlete views.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  density = "default",
  className = "",
}: SectionCardProps) {
  const pad = PADDING[density];
  return (
    <div
      className={`rounded-3xl border border-line bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${pad} ${className}`.trim()}
    >
      {(title || description || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-foreground/55">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
