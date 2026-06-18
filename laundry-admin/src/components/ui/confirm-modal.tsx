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
  /** When true, only the primary button is shown (e.g. success / acknowledgement dialogs). */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  hideCancel = false,
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
      className="fixed inset-0 z-[500] flex items-end justify-center p-3 sm:items-center sm:p-4"
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
        className="relative z-[501] w-full max-w-[420px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
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

        <div
          className={
            hideCancel
              ? "mt-5 sm:mt-6"
              : "mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-2"
          }
        >
          <button
            type="button"
            onClick={onConfirm}
            autoFocus={hideCancel}
            className="h-10 w-full whitespace-nowrap rounded-full border px-5 text-center text-[15px] font-semibold leading-none text-white sm:h-11 sm:text-base"
            style={{
              borderColor: theme.colors.filledButtonBorder,
              backgroundColor: theme.colors.secondary,
            }}
          >
            {confirmLabel}
          </button>
          {hideCancel ? null : (
            <button
              type="button"
              onClick={onCancel}
              autoFocus
              className="h-10 w-full whitespace-nowrap rounded-full border px-5 text-center text-[15px] font-semibold leading-none text-white sm:h-11 sm:text-base"
              style={{
                borderColor: "rgba(255,255,255,0.35)",
                backgroundColor: "transparent",
              }}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
