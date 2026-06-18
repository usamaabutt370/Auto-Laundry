"use client";

import { theme } from "@/lib/theme/theme";
import type { AdminPartnerKyc, PartnerKycStatus } from "@/features/admin/data/partner-kyc-demo-data";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

const STATUS_PILL: Record<PartnerKycStatus, { bg: string; fg: string; border: string }> = {
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Approved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Rejected: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

type PartnerKycReviewModalProps = {
  open: boolean;
  partner: AdminPartnerKyc | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

export function PartnerKycReviewModal({
  open,
  partner,
  onClose,
  onApprove,
  onReject,
}: PartnerKycReviewModalProps) {
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
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !partner || typeof document === "undefined") return null;

  const pill = STATUS_PILL[partner.status];
  const canDecide = partner.status === "Pending";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[201] flex max-h-[min(90dvh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{
          borderColor: theme.colors.filledButtonBorder,
          backgroundColor: theme.colors.sidebarBackground,
        }}
      >
        <div className="border-b px-4 py-4 text-left sm:px-6 sm:py-5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Partner review</p>
          <h2 id={titleId} className="mt-1 text-[18px] font-bold text-white sm:text-[22px]">
            {partner.businessName}
          </h2>
          <p className="mt-1 font-mono text-[12px] text-white/65">{partner.id}</p>
          <div className="mt-3 inline-flex">
            <span
              className="admin-status-pill inline-flex rounded-full border py-1 pl-2.5 pr-3 text-[11px] font-semibold sm:text-xs"
              style={{
                backgroundColor: pill.bg,
                color: pill.fg,
                borderColor: pill.border,
              }}
            >
              {partner.status}
            </span>
          </div>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <dl className="grid gap-3 text-left text-[13px] text-white/85 sm:gap-3.5 sm:text-[14px]">
            <div>
              <dt className="text-[11px] font-medium text-white/55">Name</dt>
              <dd className="mt-0.5 font-medium text-white">{partner.partnerName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-white/55">Email</dt>
              <dd className="mt-0.5 break-all">{partner.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-white/55">Phone</dt>
              <dd className="mt-0.5 tabular-nums">{partner.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-white/55">Submitted</dt>
              <dd className="mt-0.5 tabular-nums">{partner.submittedAt}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-white/55">Documents (summary)</dt>
              <dd className="mt-0.5 leading-relaxed text-white/80">{partner.documentsSummary}</dd>
            </div>
          </dl>

          <div className="mt-5 text-left">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-white/70">Services offered</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              All services this partner registered to offer. Connect your API to show live catalog later.
            </p>
            <ul className="mt-3 space-y-2 rounded-xl border p-3 sm:p-4" style={{ borderColor: theme.colors.outline }}>
              {partner.services.map((service, i) => (
                <li
                  key={`${partner.id}-svc-${i}`}
                  className="flex items-start gap-2 text-[13px] text-white/90 sm:text-[14px]"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: theme.colors.outline }}
                    aria-hidden
                  />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 sm:px-6 sm:py-4"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          {canDecide ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onReject(partner.id);
                  onClose();
                }}
                className="min-h-[44px] w-full rounded-xl border px-4 text-[14px] font-semibold text-[#F18C8C] sm:w-auto sm:min-w-[120px]"
                style={{ borderColor: "rgba(241, 140, 140, 0.45)" }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  onApprove(partner.id);
                  onClose();
                }}
                className="min-h-[44px] w-full rounded-xl border px-4 text-[14px] font-semibold text-white sm:w-auto sm:min-w-[120px]"
                style={{
                  borderColor: theme.colors.filledButtonBorder,
                  backgroundColor: theme.colors.secondary,
                }}
              >
                Approve
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border px-4 text-[14px] font-semibold text-white sm:ml-auto sm:w-auto sm:min-w-[120px]"
              style={{
                borderColor: theme.colors.filledButtonBorder,
                backgroundColor: theme.colors.secondary,
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
