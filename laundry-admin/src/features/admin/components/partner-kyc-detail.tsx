"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import Link from "next/link";
import type { AdminPartnerKyc, PartnerKycStatus } from "@/features/admin/data/partner-kyc-demo-data";
import { theme } from "@/lib/theme/theme";
import { useState } from "react";

type PartnerKycDetailProps = {
  partner: AdminPartnerKyc;
};

const STATUS_PILL: Record<PartnerKycStatus, { bg: string; fg: string; border: string }> = {
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Approved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Rejected: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const SERVICE_PRICE_BY_NAME: Record<string, string> = {
  "Wash & fold": "$2.10/lb",
  "Dry cleaning": "From $7.99/item",
  "Ironing / pressing": "$3.50/item",
  "Stain treatment": "$12.00+",
  "Pickup & delivery": "$4.99 flat",
  "Express same-day": "+35% surcharge",
  "Commercial / bulk": "Custom quote",
  "Alterations & tailoring": "From $15.00",
  "Shoe cleaning": "$25.00/pair",
  "Bedding & household": "$18.00/item",
};

function seedFromId(id: string): number {
  return Array.from(id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function buildEarningsBreakdown(id: string) {
  const seed = seedFromId(id);
  const completedOrders = 20 + (seed % 34);
  const dropOffGross = 1200 + (seed % 1400);
  const deliveryGross = 950 + (seed % 1100);
  const grossRevenue = dropOffGross + deliveryGross;
  const platformFee = Math.round(grossRevenue * 0.15);
  const payoutReleased = Math.round(grossRevenue * 0.7);
  const pendingPayout = Math.max(120, Math.round(grossRevenue * 0.12));
  const adjustments = 35 + (seed % 140);
  const netPartnerEarnings = payoutReleased - adjustments;

  return {
    completedOrders,
    grossRevenue,
    dropOffGross,
    deliveryGross,
    platformFee,
    payoutReleased,
    pendingPayout,
    adjustments,
    netPartnerEarnings,
  };
}

function businessAddressFromId(id: string): string {
  const num = 100 + (seedFromId(id) % 800);
  return `${num} Market St, San Francisco, CA`;
}

function servicePriceFor(serviceName: string, partnerId: string, index: number): string {
  const known = SERVICE_PRICE_BY_NAME[serviceName];
  if (known) return known;
  const base = 10 + ((seedFromId(partnerId) + index * 7) % 30);
  return `$${base}.00 flat`;
}

export function PartnerKycDetail({ partner }: PartnerKycDetailProps) {
  const [currentStatus, setCurrentStatus] = useState<PartnerKycStatus>(partner.status);
  const [accessStatus, setAccessStatus] = useState<"Active" | "Blocked">("Active");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const pill = STATUS_PILL[currentStatus];
  const canDecide = currentStatus === "Pending";
  const canManageAccess = currentStatus !== "Rejected";
  const initials = partner.partnerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const earnings = buildEarningsBreakdown(partner.id);

  const updateStatus = (next: PartnerKycStatus) => {
    setCurrentStatus(next);
    setStatusNote(`KYC status updated to ${next}.`);
    window.setTimeout(() => setStatusNote(null), 2800);
  };

  const toggleBlock = (next: "Active" | "Blocked") => {
    setAccessStatus(next);
    setStatusNote(`Partner is now ${next}.`);
    window.setTimeout(() => setStatusNote(null), 2800);
  };

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner Detail</h1>
          <p className="mt-1 text-[13px] text-white/75 sm:text-[15px]">
            Detailed profile, earnings, services, and business information for this partner.
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
              <p className="text-[16px] font-bold text-white sm:text-[18px]">{partner.partnerName}</p>
              <p className="text-[12px] text-white/70 sm:text-[13px]">{partner.businessName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-white/55">{partner.id}</p>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <span
              className="admin-status-pill inline-flex w-fit rounded-full border py-1 pl-2.5 pr-3 text-[11px] font-semibold sm:text-xs"
              style={{ backgroundColor: pill.bg, color: pill.fg, borderColor: pill.border }}
            >
              {currentStatus}
            </span>
            {canManageAccess ? (
              accessStatus === "Blocked" ? (
                <button
                  type="button"
                  onClick={() => setUnblockConfirmOpen(true)}
                  className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-white sm:w-auto sm:text-[13px]"
                  style={{ borderColor: theme.colors.outline }}
                >
                  Unblock Partner
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBlockConfirmOpen(true)}
                  className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-[#F18C8C] sm:w-auto sm:text-[13px]"
                  style={{ borderColor: "rgba(241, 140, 140, 0.45)" }}
                >
                  Block Partner
                </button>
              )
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12px] sm:text-[13px]">
          <span className="text-white/65">Partner access:</span>
          {canManageAccess ? (
            <span
              className="admin-status-pill inline-flex rounded-full border py-1 pl-2.5 pr-3 font-semibold"
              style={{
                backgroundColor: accessStatus === "Blocked" ? "rgba(241, 140, 140, 0.22)" : "rgba(110, 231, 168, 0.2)",
                color: accessStatus === "Blocked" ? "#F18C8C" : "#6EE7A8",
                borderColor: accessStatus === "Blocked" ? "rgba(241, 140, 140, 0.45)" : "rgba(110, 231, 168, 0.45)",
              }}
            >
              {accessStatus}
            </span>
          ) : (
            <span className="text-white/60">Not applicable (KYC Rejected)</span>
          )}
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
                onClick={() => updateStatus("Rejected")}
                  className="min-h-[42px] w-full rounded-xl border px-4 text-[13px] font-semibold text-[#F18C8C] sm:min-w-[120px]"
                style={{ borderColor: "rgba(241, 140, 140, 0.45)" }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => updateStatus("Approved")}
                  className="min-h-[42px] w-full rounded-xl border px-4 text-[13px] font-semibold text-white sm:min-w-[120px]"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                Approve
              </button>
            </div>
          ) : (
            <p className="text-[12px] font-medium text-white/70 sm:text-[13px]">
              This profile is already marked as <span className="text-white">{currentStatus}</span>.
            </p>
          )}
        </div>
        {canManageAccess ? (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <p className="text-[12px] text-white/65 sm:text-[13px]">
              Operational control: block partner from receiving new orders.
            </p>
          </div>
        ) : null}
        {statusNote ? (
          <p className="mt-2 text-[12px] text-[#ABE9FE] sm:text-[13px]" role="status">
            {statusNote}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border p-3.5 sm:p-4" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <p className="text-[11px] uppercase tracking-wide text-white/60">Completed orders</p>
          <p className="mt-1 text-[22px] font-bold text-white">{earnings.completedOrders}</p>
        </article>
        <article className="rounded-xl border p-3.5 sm:p-4" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <p className="text-[11px] uppercase tracking-wide text-white/60">Gross revenue</p>
          <p className="mt-1 text-[22px] font-bold text-white">{formatMoney(earnings.grossRevenue)}</p>
        </article>
        <article className="rounded-xl border p-3.5 sm:p-4" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <p className="text-[11px] uppercase tracking-wide text-white/60">Payout released</p>
          <p className="mt-1 text-[22px] font-bold text-white">{formatMoney(earnings.payoutReleased)}</p>
        </article>
        <article className="rounded-xl border p-3.5 sm:p-4" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <p className="text-[11px] uppercase tracking-wide text-white/60">Net partner earnings</p>
          <p className="mt-1 text-[22px] font-bold text-white">{formatMoney(earnings.netPartnerEarnings)}</p>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Earnings details</h2>
          <dl className="mt-3 space-y-2 text-[13px] sm:text-[14px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Drop-off gross</dt>
              <dd className="text-right font-semibold text-white">{formatMoney(earnings.dropOffGross)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Delivery gross</dt>
              <dd className="text-right font-semibold text-white">{formatMoney(earnings.deliveryGross)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Platform fee (15%)</dt>
              <dd className="text-right font-semibold text-white/85">- {formatMoney(earnings.platformFee)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Pending payout</dt>
              <dd className="text-right font-semibold text-white">{formatMoney(earnings.pendingPayout)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-white/70">Refunds / adjustments</dt>
              <dd className="text-right font-semibold text-white/85">- {formatMoney(earnings.adjustments)}</dd>
            </div>
            <div className="mt-2 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13px] font-bold text-white">Net partner earnings</dt>
                <dd className="text-[15px] font-bold text-[#6EE7A8]">{formatMoney(earnings.netPartnerEarnings)}</dd>
              </div>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
          <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Business details</h2>
          <dl className="mt-3 grid gap-2.5 text-[13px] sm:text-[14px]">
            <div>
              <dt className="text-[11px] text-white/60">Business name</dt>
              <dd className="mt-0.5 text-white">{partner.businessName}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Primary contact name</dt>
              <dd className="mt-0.5 text-white">{partner.partnerName}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Email</dt>
              <dd className="mt-0.5 break-all text-white">{partner.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Phone</dt>
              <dd className="mt-0.5 tabular-nums text-white">{partner.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Business address</dt>
              <dd className="mt-0.5 text-white">{businessAddressFromId(partner.id)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">Documents summary</dt>
              <dd className="mt-0.5 text-white/85">{partner.documentsSummary}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/60">KYC submitted</dt>
              <dd className="mt-0.5 tabular-nums text-white">{partner.submittedAt}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}>
        <h2 className="text-[15px] font-bold text-white sm:text-[17px]">Services offered</h2>
        <p className="mt-1 text-[12px] text-white/65 sm:text-[13px]">All listed services include the partner's declared price.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {partner.services.map((service, idx) => (
            <li key={`${partner.id}-${service}`} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px] text-white/90 sm:text-[14px]" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: theme.colors.outline }} />
                <span className="min-w-0 break-words">{service}</span>
              </div>
              <span className="shrink-0 whitespace-nowrap tabular-nums text-right text-white">{servicePriceFor(service, partner.id, idx)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmModal
        open={canManageAccess && blockConfirmOpen}
        title="Block partner?"
        description="This partner will be prevented from receiving new orders until you unblock them."
        confirmLabel="Block"
        cancelLabel="Cancel"
        onConfirm={() => {
          setBlockConfirmOpen(false);
          toggleBlock("Blocked");
        }}
        onCancel={() => setBlockConfirmOpen(false)}
      />
      <ConfirmModal
        open={canManageAccess && unblockConfirmOpen}
        title="Unblock partner?"
        description="This partner can receive new orders again."
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={() => {
          setUnblockConfirmOpen(false);
          toggleBlock("Active");
        }}
        onCancel={() => setUnblockConfirmOpen(false)}
      />
    </section>
  );
}
