"use client";

import { theme } from "@/lib/theme/theme";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[201] w-full max-w-[420px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
        style={{
          borderColor: theme.colors.filledButtonBorder,
          backgroundColor: theme.colors.sidebarBackground,
        }}
      >
        <h2 id={titleId} className="text-[18px] font-bold text-white sm:text-[22px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[13px] leading-relaxed text-white/80 sm:text-[15px]">
            {description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 w-full rounded-full border px-5 text-[15px] font-semibold text-white sm:h-11 sm:text-base"
            style={{
              borderColor: theme.colors.filledButtonBorder,
              backgroundColor: theme.colors.secondary,
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="h-10 w-full rounded-full border px-5 text-[15px] font-semibold text-white sm:h-11 sm:text-base"
            style={{
              borderColor: "rgba(255,255,255,0.35)",
              backgroundColor: "transparent",
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
