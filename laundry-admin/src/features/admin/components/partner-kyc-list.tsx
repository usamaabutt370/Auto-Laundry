"use client";

import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type {
  AdminPartnerKycDetail,
  AdminPartnerKycListItem,
  PartnerOnboardingStatus,
} from "@/features/admin/types/admin-partner-kyc";
import { AdminDesktopTable, AdminListPagination } from "@/features/admin/components/admin-list-ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/** Lets the partner detail drawer finish closing before the success dialog opens (no stacked modals). */
const APPROVE_SUCCESS_POPUP_DELAY_MS = 220;

type PartnerKycListProps = {
  partners: AdminPartnerKycListItem[];
};

type StatusFilter = "all" | PartnerOnboardingStatus;

const PAGE_SIZE = 10;

const KYC_STATUSES: PartnerOnboardingStatus[] = ["pending", "approved", "rejected"];

const STATUS_PILL: Record<PartnerOnboardingStatus, { bg: string; fg: string; border: string }> = {
  pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  approved: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  rejected: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

/**
 * Tuned desktop columns with a consistent gutter.
 * Gives Email and Submitted clearer breathing room while keeping Status/Actions tighter.
 */
const tableGridClass =
  "grid grid-cols-[minmax(96px,1fr)_minmax(124px,1.15fr)_minmax(116px,1fr)_minmax(150px,1.2fr)_minmax(112px,0.95fr)_minmax(176px,1.3fr)_minmax(98px,0.82fr)] items-center gap-x-4 gap-y-1";

function matchesQuery(row: AdminPartnerKycListItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    row.userId.toLowerCase().includes(s) ||
    row.businessName.toLowerCase().includes(s) ||
    row.partnerName.toLowerCase().includes(s) ||
    row.email.toLowerCase().includes(s) ||
    row.phone.toLowerCase().includes(s)
  );
}

function formatStatus(status: PartnerOnboardingStatus): string {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function formatDate(iso: string | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

/** Full-screen dimmed overlay + centered spinner while partner detail API runs. */
function PartnerKycFullscreenLoader() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading partner details</span>
      <div
        className="flex max-w-[min(100%,380px)] flex-col items-center gap-5 rounded-2xl border px-10 py-12 text-center shadow-2xl sm:px-14 sm:py-14"
        style={{
          borderColor: theme.colors.filledButtonBorder,
          backgroundColor: theme.colors.sidebarBackground,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <svg
          className="h-14 w-14 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <div>
          <p className="text-[16px] font-semibold text-white">Loading partner details</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/45">Fetching profile, services, and KYC data…</p>
        </div>
      </div>
    </div>
  );
}

export function PartnerKycList({ partners }: PartnerKycListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState<AdminPartnerKycDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<PartnerOnboardingStatus>("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [approveSuccessOpen, setApproveSuccessOpen] = useState(false);
  const [approveSuccessPartnerName, setApproveSuccessPartnerName] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const searched = partners.filter((p) => matchesQuery(p, query));
    if (statusFilter === "all") return searched;
    return searched.filter((p) => p.status === statusFilter);
  }, [partners, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, pageCount));

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const total = filtered.length;
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, total);

  const pageNumbers = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const nums: number[] = [];
    const windowStart = Math.max(2, safePage - 1);
    const windowEnd = Math.min(pageCount - 1, safePage + 1);
    nums.push(1);
    if (windowStart > 2) nums.push(-1);
    for (let n = windowStart; n <= windowEnd; n++) nums.push(n);
    if (windowEnd < pageCount - 1) nums.push(-1);
    nums.push(pageCount);
    return nums;
  }, [safePage, pageCount]);

  async function openDetailModal(partnerId: string) {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setStatusNote(null);
    try {
      const response = await fetch(`/api/admin/partner-kyc/${encodeURIComponent(partnerId)}`);
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; partner: AdminPartnerKycDetail }
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("ok" in payload && payload.ok)) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : "Failed to load detail.");
      }
      setSelectedPartnerDetail(payload.partner);
      setCurrentStatus(payload.partner.request.status);
      setRejectionReason(payload.partner.request.rejectionReason ?? "");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitDecision(action: "approve" | "reject") {
    if (!selectedPartnerDetail) return;
    const reason = rejectionReason.trim();
    if (action === "reject" && !reason) {
      setStatusNote("Rejection reason is required.");
      return;
    }
    setBusy(action);
    setStatusNote(null);
    try {
      const response = await fetch(`/api/admin/partner-kyc/${encodeURIComponent(selectedPartnerDetail.userId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Request failed with status ${response.status}`);

      const nextStatus = action === "approve" ? "approved" : "rejected";
      if (action === "approve") {
        const partnerName = selectedPartnerDetail.profile.fullName;
        setSelectedPartnerId(null);
        setSelectedPartnerDetail(null);
        setDetailError(null);
        setStatusNote(null);
        router.refresh();
        window.setTimeout(() => {
          setApproveSuccessPartnerName(partnerName);
          setApproveSuccessOpen(true);
        }, APPROVE_SUCCESS_POPUP_DELAY_MS);
      } else {
        setCurrentStatus(nextStatus);
        setSelectedPartnerDetail((prev) =>
          prev
            ? {
                ...prev,
                request: {
                  ...prev.request,
                  status: nextStatus,
                  rejectionReason: nextStatus === "rejected" ? reason : null,
                },
              }
            : prev,
        );
        setStatusNote(`KYC request ${nextStatus}.`);
      }
    } catch (error) {
      setStatusNote(error instanceof Error ? error.message : "Failed to update KYC status.");
    } finally {
      setBusy(null);
    }
  }

  function closeModal() {
    setSelectedPartnerId(null);
    setSelectedPartnerDetail(null);
    setDetailError(null);
    setStatusNote(null);
    setApproveSuccessOpen(false);
    setApproveSuccessPartnerName(null);
    setBusy(null);
  }

  function dismissApproveSuccess() {
    setApproveSuccessOpen(false);
    setApproveSuccessPartnerName(null);
  }

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <ConfirmModal
        open={approveSuccessOpen}
        title="KYC approved"
        description={
          approveSuccessPartnerName
            ? `${approveSuccessPartnerName}'s KYC has been approved successfully.`
            : "This partner's KYC has been approved successfully."
        }
        confirmLabel="OK"
        hideCancel
        onConfirm={dismissApproveSuccess}
        onCancel={dismissApproveSuccess}
      />
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner KYC</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          For {PRODUCT_NAME}: open a partner to view profile, status, services, business details, and earnings
          breakdown.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by KYC ID, business, name, email, phone…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          />
        </div>
        <label className="sr-only" htmlFor="kyc-status-filter">
          Filter by verification status
        </label>
        <select
          id="kyc-status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[min(100%,220px)]"
          style={{
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.sidebarBackground,
          }}
        >
          <option value="all">All statuses</option>
          {KYC_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <AdminDesktopTable minWidthClassName="w-full min-w-[1180px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">User ID</span>
            <span className="text-left">Business</span>
            <span className="text-left">Name</span>
            <span className="text-left">Email</span>
            <span className="text-left">Submitted</span>
            <span className="text-left">Reviewed</span>
            <span className="text-left">Status</span>
          </div>
          {paged.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">
              No partner submissions match your search or filters.
            </div>
          ) : null}
          {paged.map((row) => {
            const pill = STATUS_PILL[row.status];
            return (
              <button
                key={row.userId}
                type="button"
                onClick={() => openDetailModal(row.userId)}
                className={`${tableGridClass} w-full border-b px-4 py-2.5 text-[13px] text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:py-3`}
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="text-left font-semibold tabular-nums leading-snug">{row.userId}</span>
                <span className="min-w-0 truncate text-left" title={row.businessName}>
                  {row.businessName}
                </span>
                <span className="min-w-0 truncate text-left" title={row.partnerName}>
                  {row.partnerName}
                </span>
                <span
                  className="min-w-0 truncate text-left font-mono text-[11px] text-white/80 sm:text-xs"
                  title={row.email}
                >
                  {row.email}
                </span>
                <span className="whitespace-nowrap text-left tabular-nums text-white/85">
                  {formatDate(row.submittedAt)}
                </span>
                <span className="whitespace-nowrap text-left tabular-nums text-white/75">
                  {formatDate(row.reviewedAt)}
                </span>
                <div className="flex justify-start">
                  <span
                    className={`${statusPillClass} inline-flex max-w-full rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: pill.bg,
                      color: pill.fg,
                      borderColor: pill.border,
                    }}
                  >
                    {formatStatus(row.status)}
                  </span>
                </div>
              </button>
            );
          })}
      </AdminDesktopTable>

      <div className="grid gap-3 md:hidden">
        {paged.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No partner submissions match your search or filters.
          </p>
        ) : null}
        {paged.map((row) => {
          const pill = STATUS_PILL[row.status];
          return (
            <button
              key={row.userId}
              type="button"
              onClick={() => openDetailModal(row.userId)}
              className="rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04] sm:p-4"
              style={{
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.sidebarBackground,
              }}
            >
              <div className="min-w-0 text-left">
                <p className="text-[15px] font-bold tabular-nums text-white sm:text-[16px]">{row.userId}</p>
                <p className="mt-0.5 text-[13px] font-medium text-white">{row.businessName}</p>
              </div>
              <dl className="mt-3 space-y-2.5 text-left text-[12px] text-white/85 sm:space-y-3 sm:text-[13px]">
                <div>
                  <dt className="text-[11px] text-white/55">Name</dt>
                  <dd className="mt-0.5 font-medium text-white">{row.partnerName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Email</dt>
                  <dd className="mt-0.5 break-all">{row.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Phone</dt>
                  <dd className="mt-0.5 tabular-nums">{row.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Submitted</dt>
                  <dd className="mt-0.5 tabular-nums">{formatDate(row.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Reviewed</dt>
                  <dd className="mt-0.5 tabular-nums text-white/80">{formatDate(row.reviewedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/55">Status</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3 text-[11px] sm:text-xs`}
                      style={{
                        backgroundColor: pill.bg,
                        color: pill.fg,
                        borderColor: pill.border,
                      }}
                    >
                      {formatStatus(row.status)}
                    </span>
                  </dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <AdminListPagination
        page={safePage}
        pageCount={pageCount}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        pageNumbers={pageNumbers}
      />

      {selectedPartnerId ? (
        <div className="fixed inset-0 z-[220]" role="presentation">
          <button
            type="button"
            aria-label={detailLoading ? "Close loading" : "Close partner KYC details"}
            className={
              detailLoading
                ? "absolute inset-0 bg-black/65 backdrop-blur-[3px]"
                : "absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            }
            onClick={closeModal}
          />
          {detailLoading ? (
            <PartnerKycFullscreenLoader />
          ) : (
          <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[1] flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-full border text-[20px] font-semibold leading-none text-white transition hover:brightness-110"
              style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              aria-label="Close modal"
            >
              ×
            </button>
            {detailError ? (
              <p className="min-h-[100px] text-sm leading-relaxed text-[#F18C8C]">{detailError}</p>
            ) : selectedPartnerDetail ? (
              <div className="scrollbar-hidden min-h-0 overflow-y-auto pr-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Partner KYC detail</p>
                <h2 className="mt-1 pr-10 text-[18px] font-bold text-white sm:text-[22px]">{selectedPartnerDetail.profile.fullName}</h2>
                <p className="mt-1 font-mono text-[12px] text-white/60">{selectedPartnerDetail.userId}</p>
                <div className="mt-3">
                  <span
                    className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: STATUS_PILL[currentStatus].bg,
                      color: STATUS_PILL[currentStatus].fg,
                      borderColor: STATUS_PILL[currentStatus].border,
                    }}
                  >
                    {formatStatus(currentStatus)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Email</p>
                    <p className="mt-1 break-all text-[14px] text-white">{selectedPartnerDetail.profile.email || "N/A"}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Phone</p>
                    <p className="mt-1 text-[14px] text-white">{selectedPartnerDetail.profile.phone || "N/A"}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Business</p>
                    <p className="mt-1 text-[14px] text-white">{selectedPartnerDetail.business.businessName || "N/A"}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Submitted</p>
                    <p className="mt-1 text-[14px] text-white">{formatDate(selectedPartnerDetail.request.submittedAt)}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Role</p>
                    <p className="mt-1 text-[14px] text-white">{selectedPartnerDetail.profile.role || "N/A"}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Profile Created</p>
                    <p className="mt-1 text-[14px] text-white">{formatDate(selectedPartnerDetail.profile.createdAt)}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Reviewed</p>
                    <p className="mt-1 text-[14px] text-white">{formatDate(selectedPartnerDetail.request.reviewedAt)}</p>
                  </article>
                  <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Reviewed By</p>
                    <p className="mt-1 text-[14px] text-white">{selectedPartnerDetail.request.reviewedBy || "N/A"}</p>
                  </article>
                </div>

                <div className="mt-4 rounded-xl border p-3.5 sm:p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <h3 className="text-[14px] font-bold text-white">Business details</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-lg border px-3 py-2.5 sm:col-span-2" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      <p className="text-[11px] uppercase tracking-wide text-white/55">Business Description</p>
                      <p className="mt-1 text-[13px] text-white">{selectedPartnerDetail.business.businessDescription || "N/A"}</p>
                    </article>
                    <article className="rounded-lg border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      <p className="text-[11px] uppercase tracking-wide text-white/55">Pickup & Delivery</p>
                      <p className="mt-1 text-[13px] text-white">
                        {selectedPartnerDetail.business.pickupDeliveryEnabled === null
                          ? "N/A"
                          : selectedPartnerDetail.business.pickupDeliveryEnabled
                            ? "Yes"
                            : "No"}
                      </p>
                    </article>
                    <article className="rounded-lg border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      <p className="text-[11px] uppercase tracking-wide text-white/55">Pickup & Delivery Amount</p>
                      <p className="mt-1 text-[13px] text-white">{selectedPartnerDetail.business.pickupDeliveryAmount || "N/A"}</p>
                    </article>
                    <article className="rounded-lg border px-3 py-2.5 sm:col-span-2" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      <p className="text-[11px] uppercase tracking-wide text-white/55">Request ID</p>
                      <p className="mt-1 break-all font-mono text-[12px] text-white">{selectedPartnerDetail.request.id || "N/A"}</p>
                    </article>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border p-3.5 sm:p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <h3 className="text-[14px] font-bold text-white">KYC actions</h3>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Add reason shown to partner if rejected."
                    className="mt-3 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/40"
                    style={{ borderColor: theme.colors.outline }}
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={busy !== null || currentStatus !== "pending"}
                      onClick={() => submitDecision("reject")}
                      className="min-h-[42px] rounded-xl border px-4 text-[13px] font-semibold text-[#F18C8C] disabled:opacity-50"
                      style={{ borderColor: "rgba(241, 140, 140, 0.45)" }}
                    >
                      {busy === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || currentStatus !== "pending"}
                      onClick={() => submitDecision("approve")}
                      className="min-h-[42px] rounded-xl border px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                      style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
                    >
                      {busy === "approve" ? "Approving..." : "Approve"}
                    </button>
                  </div>
                  {statusNote ? <p className="mt-2 text-[12px] text-[#ABE9FE]">{statusNote}</p> : null}
                </div>

                <div className="mt-4 rounded-xl border p-3.5 sm:p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <h3 className="text-[14px] font-bold text-white">Services offered</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selectedPartnerDetail.services.map((service) => (
                      <li key={service.id} className="rounded-lg border px-3 py-2 text-[13px] text-white/90" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                        {service.name} <span className="text-white/65">({service.priceDisplay || "N/A"})</span>
                      </li>
                    ))}
                    {selectedPartnerDetail.services.length === 0 ? (
                      <li className="text-[12px] text-white/60">No services listed.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>
          </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
