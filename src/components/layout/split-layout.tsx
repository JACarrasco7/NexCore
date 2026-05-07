"use client";

import type { ReactNode } from "react";

type SplitVariant = "aside-left" | "aside-right" | "wide-aside";

interface SplitLayoutProps {
  aside: ReactNode;
  main: ReactNode;
  variant?: SplitVariant;
  className?: string;
}

const ASIDE_WIDTHS: Record<SplitVariant, string> = {
  "aside-left": "xl:grid-cols-[340px_minmax(0,1fr)]",
  "aside-right": "xl:grid-cols-[minmax(0,1fr)_340px]",
  "wide-aside": "xl:grid-cols-[420px_minmax(0,1fr)]",
};

/**
 * Two-column layout with a sticky aside.
 * When `aside` is null/undefined, renders single-column full-width.
 */
export function SplitLayout({
  aside,
  main,
  variant = "aside-left",
  className = "",
}: SplitLayoutProps) {
  const cols = aside ? ASIDE_WIDTHS[variant] : "";
  const isRight = variant === "aside-right";

  return (
    <div className={`grid gap-6 ${aside ? cols : "grid-cols-1"} ${className}`.trim()}>
      {!isRight && aside && (
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">{aside}</aside>
      )}
      <div className="min-w-0">{main}</div>
      {isRight && aside && (
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">{aside}</aside>
      )}
    </div>
  );
}
