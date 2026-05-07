"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: string;
  /** Render a footer bar inside the drawer */
  footer?: ReactNode;
}

/**
 * Right-side slide-in panel.
 * Used for details and forms that don't need to block the full screen.
 * Replaces full-screen modals in workspace views.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  width = "480px",
  footer,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus and close on Escape
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ width, maxWidth: "100vw" }}
        className="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-line bg-background shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          {title ? (
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line text-foreground/50 transition hover:bg-surface hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-line px-5 py-4">{footer}</div>
        )}
      </div>
    </>
  );
}
