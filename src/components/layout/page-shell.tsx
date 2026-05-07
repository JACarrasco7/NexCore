"use client";

import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Base container used by all pages.
 * Provides consistent max-width, padding and vertical layout.
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <main
      className={`mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-6 px-6 py-6 md:px-10 lg:px-12 ${className}`.trim()}
    >
      {children}
    </main>
  );
}
