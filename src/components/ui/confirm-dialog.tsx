"use client";

import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      size="sm"
      title={title}
      description={description}
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-surface-strong disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              tone === "danger" ? "bg-danger hover:bg-danger/85" : "bg-accent hover:bg-accent-strong"
            }`}
          >
            {busy ? "Procesando..." : confirmLabel}
          </button>
        </div>
      )}
    >
      <p className="text-sm text-foreground/70">{description}</p>
    </Modal>
  );
}