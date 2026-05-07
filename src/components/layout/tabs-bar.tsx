"use client";

import { type ReactNode, useId } from "react";

interface Tab {
  key: string;
  label: ReactNode;
  badge?: number | string;
}

interface TabsBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  variant?: "primary" | "secondary";
  className?: string;
}

/**
 * Accessible tab bar with keyboard navigation.
 * variant="primary"   → pill style (large, main tabs)
 * variant="secondary" → underline style (subtabs)
 */
export function TabsBar({
  tabs,
  active,
  onChange,
  variant = "primary",
  className = "",
}: TabsBarProps) {
  const baseId = useId();

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    const len = tabs.length;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(tabs[(idx + 1) % len].key);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(tabs[(idx - 1 + len) % len].key);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(tabs[0].key);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(tabs[len - 1].key);
    }
  }

  if (variant === "secondary") {
    return (
      <div
        role="tablist"
        className={`flex items-center gap-1 border-b border-line ${className}`.trim()}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              id={`${baseId}-tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onClick={() => onChange(tab.key)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors ${
                isActive
                  ? "text-accent after:bg-accent"
                  : "text-foreground/55 after:bg-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    isActive ? "bg-accent/15 text-accent" : "bg-surface-strong text-foreground/50"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            id={`${baseId}-tab-${tab.key}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${baseId}-panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? "border-accent/40 bg-accent/10 text-accent shadow-[0_0_10px_var(--accent-glow)]"
                : "border-transparent bg-surface text-foreground/60 hover:border-line hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  isActive ? "bg-accent/20 text-accent" : "bg-surface-strong text-foreground/50"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
