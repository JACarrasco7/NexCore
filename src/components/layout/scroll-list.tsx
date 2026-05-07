"use client";

import type { ReactNode } from "react";

interface ScrollListProps {
  children: ReactNode;
  maxHeight?: string;
  footer?: ReactNode;
  className?: string;
}

/**
 * Wrapper for long lists that should scroll locally instead of
 * pushing the page layout. Default max-height 360px.
 */
export function ScrollList({
  children,
  maxHeight = "360px",
  footer,
  className = "",
}: ScrollListProps) {
  return (
    <div className={className}>
      <div
        className="overflow-y-auto pr-1 scrollbar-thin"
        style={{ maxHeight }}
      >
        {children}
      </div>
      {footer && (
        <div className="mt-2 border-t border-line pt-2 text-xs text-foreground/50">
          {footer}
        </div>
      )}
    </div>
  );
}
