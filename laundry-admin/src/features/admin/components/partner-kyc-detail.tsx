"use client";

import Link from "next/link";
import type {
  AdminPartnerKycDetail,
  PartnerOnboardingStatus,
} from "@/features/admin/types/admin-partner-kyc";
import { theme } from "@/lib/theme/theme";
import { useMemo, useState } from "react";

type PartnerKycDetailProps = {
  partner: AdminPartnerKycDetail;
};

const STATUS_PILL: Record<PartnerOnboardingStatus, { bg: string; fg: string; border: string }> = {
  draft: { bg: "rgba(255,255,255,0.1)", fg: "#E5E7EB", border: "rgba(255,255,255,0.25)" },
  submitted: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  approved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  rejected: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

function formatStatus(status: PartnerOnboardingStatus): string {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function PartnerKycDetail({ partner }: PartnerKycDetailProps) {
  const [currentStatus, setCurrentStatus] = useState<PartnerOnboardingStatus>(partner.request.status);
  const [rejectionReason, setRejectionReason] = useState(partner.request.rejectionReason ?? "");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const pill = STATUS_PILL[currentStatus];
  const canDecide = currentStatus === "submitted";
  const initials = partner.profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const notesPretty = useMemo(
    () => JSON.stringify(partner.request.notes ?? partner.request.notesRaw ?? {}, null, 2),
    [partner.request.notes, partner.request.notesRaw],
  );

  async function submitDecision(action: "approve" | "reject") {
    const reason = rejectionReason.trim();
    if (action === "reject" && !reason) {
      setStatusNote("Rejection reason is required.");
      return;
    }
    setBusy(action);
    setStatusNote(null);
    try {
      const response = await fetch(`/api/admin/partner-kyc/${encodeURIComponent(partner.userId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
      }
      const nextStatus = action === "approve" ? "approved" : "rejected";
      setCurrentStatus(nextStatus);
      if (nextStatus === "approved") setRejectionReason("");
      setStatusNote(`KYC request ${nextStatus}.`);
    } catch (error) {
      setStatusNote(error instanceof Error ? error.message : "Failed to update KYC status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner Detail</h1>
          <p className="mt-1 text-[13px] text-white/75 sm:text-[15px]">
            Real KYC data from partner onboarding request and profile tables.
          </p>
        </div>
        <Link
          href="/partner-kyc"
          className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-white/5 sm:w-auto sm:text-[13px]"
          style={{ borderColor: theme.colors.outline }}
        >
          Back to Partner KYC
        </Link>
      </div>

      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: "rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border text-[18px] font-bold text-white/95 sm:h-16 sm:w-16 sm:text-[20px]" style={{ borderColor: theme.colors.outline, backgroundColor: "rgba(255,255,255,0.08)" }}>
              {initials || "P"}
            </div>
            <div>
              <p className="text-[16px] font-bold text-white sm:text-[18px]">{partner.profile.fullName}</p>
              <p className="text-[12px] text-white/70 sm:text-[13px]">{partner.business.businessName || "N/A"}</p>
              <p className="mt-0.5 font-mono text-[11px] text-white/55">{partner.userId}</p>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end text-left sm:text-right">
            <span
              className="admin-status-pill inline-flex w-fit rounded-full border py-1 pl-2.5 pr-3 text-[11px] font-semibold sm:text-xs"
              style={{ backgroundColor: pill.bg, color: pill.fg, borderColor: pill.border }}
            >
              {formatStatus(currentStatus)}
            </span>
            <p className="text-[11px] text-white/65">Request ID: {partner.request.id || "N/A"}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2 sm:text-[13px]">
          <p className="text-white/70">Submitted: <span className="text-white">{formatDate(partner.request.submittedAt)}</span></p>
          <p className="text-white/70">Reviewed: <span className="text-white">{formatDate(partner.request.reviewedAt)}</span></p>
          <p className="text-white/70">Reviewed by: <span className="text-white">{partner.request.reviewedBy || "N/A"}</span></p>
          <p className="text-white/70">Role: <span className="text-white">{partner.profile.role || "N/A"}</span></p>
        </div>
      </section>

      <section className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-white sm:text-[17px]">KYC actions</h2>
            <p className="mt-1 text-[12px] text-white/65 sm:text-[13px]">
              Approve or reject this partner directly from detail view.
            </p>
          </div>
          {canDecide ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                type="button"
                disabled={busy !== null}
                onClick={() => submitDecision("reject")}
                className="min-h-[42px] w-full rounded-xl border px-4 text-[13px] font-semibold text-[#F18C8C] disabled:opacity-50 sm:min-w-[120px]"
                style={{ borderColor: "rgba(241, 140, 140, 0.45)" }}
              >
                {busy === "reject" ? "Rejecting..." : "Reject"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => submitDecision("approve")}
                className="min-h-[42px] w-full rounded-xl border px-4 text-[13px] font-semibold text-white disabled:opacity-50 sm:min-w-[120px]"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                {busy === "approve" ? "Approving..." : "Approve"}
              </button>
            </div>
          ) : (
            <p className="text-[12px] font-medium text-white/70 sm:text-[13px]">
              This profile is already marked as <span className="text-white">{formatStatus(currentStatus)}</span>.
            </p>
          )}
        </div>
        <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <label className="text-[12px] text-white/70 sm:text-[13px]" htmlFor="rejection-reason">
            Rejection reason (required for reject)
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="Add reason shown to partner if rejected."
            className="mt-2 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/40"
            style={{ borderColor: theme.colors.outline }}
          />
        </div>
        {statusNote ? (
          <p className="mt-2 text-[12px] text-[#ABE9FE] sm:text-[13px]" role="status">
            {statusNote}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Profile details</h2>
          <dl className="mt-3 space-y-2 text-[13px] sm:text-[14px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Name</dt>
              <dd className="text-right font-semibold text-white">{partner.profile.fullName}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Email</dt>
              <dd className="text-right font-semibold text-white">{partner.profile.email || "N/A"}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Phone</dt>
              <dd className="text-right font-semibold text-white">{partner.profile.phone || "N/A"}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Profile created</dt>
              <dd className="text-right font-semibold text-white">{formatDate(partner.profile.createdAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Business details</h2>
          <dl className="mt-3 grid gap-2.5 text-[13px] sm:text-[14px]">
            <div>
              <dt className="text-[11px] text-white/60">Business name</dt>
              <dd className="mt-0.5 text-white">{partner.business.businessName || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Business description</dt>
              <dd className="mt-0.5 text-white">{partner.business.businessDescription || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Pickup & delivery enabled</dt>
              <dd className="mt-0.5 break-all text-white">
                {partner.business.pickupDeliveryEnabled === null
                  ? "N/A"
                  : partner.business.pickupDeliveryEnabled
                    ? "Yes"
                    : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Pickup & delivery amount</dt>
              <dd className="mt-0.5 tabular-nums text-white">{partner.business.pickupDeliveryAmount || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Submitted at</dt>
              <dd className="mt-0.5 text-white">{formatDate(partner.request.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Rejection reason</dt>
              <dd className="mt-0.5 text-white/85">{partner.request.rejectionReason || "N/A"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
        <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Services offered</h2>
        <p className="mt-1 text-[12px] text-white/65 sm:text-[13px]">All listed services from `partner_services`.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {partner.services.map((service) => (
            <li key={service.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px] text-white/90 sm:text-[14px]" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: theme.colors.outline }} />
                <span className="min-w-0 break-words">{service.name}</span>
              </div>
              <span className="shrink-0 whitespace-nowrap tabular-nums text-right text-white">
                {service.priceDisplay || "N/A"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
        <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Submission snapshot (`notes`)</h2>
        <pre
          className="mt-3 overflow-x-auto rounded-lg border p-3 text-[12px] leading-relaxed text-white/85"
          style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.2)" }}
        >
          {notesPretty}
        </pre>
      </section>
    </section>
  );
}
