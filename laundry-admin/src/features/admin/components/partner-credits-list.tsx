"use client";

import {
  AdminListPagination,
  adminPaginationView,
  buildAdminPageNumbers,
  useAdminListUrl,
  useDebouncedListSearch,
} from "@/features/admin/components/admin-list-ui";
import type { PaginatedResult } from "@/features/admin/server/admin-list-query";
import type { PartnerCreditBalanceListItem } from "@/features/admin/server/credits/partner-credits.repository";
import { theme } from "@/lib/theme/theme";
import type { CreditTransaction, UserCreditBalance } from "@/features/admin/types/admin-credits";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const HISTORY_PAGE_SIZE = 5;

function formatCredits(n: number) {
  const abs = Math.abs(n);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${abs.toLocaleString()} cr`;
}

type PartnerCreditsListProps = {
  data: PaginatedResult<PartnerCreditBalanceListItem>;
};

export function PartnerCreditsList({ data }: PartnerCreditsListProps) {
  const router = useRouter();
  const { setPage } = useAdminListUrl();
  const { query, setQuery } = useDebouncedListSearch();
  const partners = data.items;
  const { pageCount, rangeStart, rangeEnd, pageNumbers } = adminPaginationView(data);
  const [selectedPartner, setSelectedPartner] = useState<PartnerCreditBalanceListItem | null>(null);
  const [amountByPartner, setAmountByPartner] = useState<Record<string, string>>({});
  const [editBalanceByPartner, setEditBalanceByPartner] = useState<Record<string, string>>({});
  const [editBalanceTouchedByPartner, setEditBalanceTouchedByPartner] = useState<Record<string, boolean>>({});
  const [isEditingBalanceByPartner, setIsEditingBalanceByPartner] = useState<Record<string, boolean>>({});
  const [amountTouchedByPartner, setAmountTouchedByPartner] = useState<Record<string, boolean>>({});
  const [confirmInlineOpen, setConfirmInlineOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTransactions, setHistoryTransactions] = useState<CreditTransaction[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const historyPageCount = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const historyCurrentPage = Math.min(historyPage, historyPageCount);
  const historyPageNumbers = useMemo(
    () => buildAdminPageNumbers(historyCurrentPage, historyPageCount),
    [historyCurrentPage, historyPageCount],
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedPartner?.userId]);

  useEffect(() => {
    if (!selectedPartner) {
      setHistoryTransactions([]);
      setHistoryTotal(0);
      return;
    }

    const partnerId = selectedPartner.userId;
    const controller = new AbortController();
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(historyPage),
          pageSize: String(HISTORY_PAGE_SIZE),
        });
        const response = await fetch(
          `/api/admin/partner-credits/${encodeURIComponent(partnerId)}/transactions?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as
          | { items: CreditTransaction[]; total: number; error?: string }
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
        }
        setHistoryTransactions(payload.items);
        setHistoryTotal(payload.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHistoryTransactions([]);
        setHistoryTotal(0);
      } finally {
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => controller.abort();
  }, [selectedPartner?.userId, historyPage]);

  const partnerStats = useMemo(() => {
    if (!selectedPartner) return { topup: 0, usage: 0 };
    return { topup: selectedPartner.topup, usage: selectedPartner.usage };
  }, [selectedPartner]);

  const currentAmount = selectedPartner ? amountByPartner[selectedPartner.userId] ?? "" : "";
  const currentEditBalance = selectedPartner ? editBalanceByPartner[selectedPartner.userId] ?? "" : "";
  const amountError =
    currentAmount === ""
      ? "Credits amount is required"
      : Number(currentAmount) <= 0
        ? "Amount must be greater than 0"
        : !Number.isInteger(Number(currentAmount))
          ? "Amount must be whole number"
          : "";
  const hasErrors = !!amountError;
  const showAmountError = !!selectedPartner && (amountTouchedByPartner[selectedPartner.userId] ?? false) && !!amountError;
  const editBalanceError =
    currentEditBalance === ""
      ? "Balance is required"
      : Number(currentEditBalance) < 0
        ? "Balance cannot be negative"
        : !Number.isInteger(Number(currentEditBalance))
          ? "Balance must be whole number"
          : "";
  const showEditBalanceError =
    !!selectedPartner && (editBalanceTouchedByPartner[selectedPartner.userId] ?? false) && !!editBalanceError;
  const isEditingCurrentBalance =
    !!selectedPartner && (isEditingBalanceByPartner[selectedPartner.userId] ?? false);

  function closePartnerDetailModal() {
    if (!selectedPartner) {
      setConfirmInlineOpen(false);
      setSubmitError(null);
      return;
    }
    setAmountByPartner((prev) => ({ ...prev, [selectedPartner.userId]: "" }));
    setEditBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: "" }));
    setAmountTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }));
    setEditBalanceTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }));
    setIsEditingBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }));
    setConfirmInlineOpen(false);
    setSubmitError(null);
    setEditingBalance(false);
    setSelectedPartner(null);
  }

  useEffect(() => {
    if (!selectedPartner) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePartnerDetailModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPartner]);

  async function handleConfirm() {
    if (!selectedPartner || hasErrors || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(
        `/api/admin/partner-credits/${encodeURIComponent(selectedPartner.userId)}/topup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(currentAmount),
            note: `Admin top-up from credits panel (${Number(currentAmount).toLocaleString()} cr)`,
          }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { ok: true; transaction: CreditTransaction; balance: UserCreditBalance }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("ok" in result && result.ok)) {
        throw new Error(result && "error" in result && result.error ? result.error : "Failed to add credits.");
      }

      setSelectedPartner((prev) =>
        prev && prev.userId === result.balance.userId
          ? {
              ...prev,
              ...result.balance,
              topup: prev.topup + result.transaction.amount,
            }
          : prev,
      );
      setHistoryPage(1);
      router.refresh();
      setConfirmInlineOpen(false);
      setSubmitting(false);
      setSuccess(`${Number(currentAmount).toLocaleString()} credits added to ${result.balance.userName}`);
      setAmountByPartner((prev) => ({ ...prev, [selectedPartner.userId]: "" }));
      setAmountTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }));
      window.setTimeout(() => setSuccess(null), 3500);
    } catch (error) {
      setSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : "Failed to add credits.");
    }
  }

  async function handleSaveEditedBalance() {
    if (!selectedPartner || !!editBalanceError || editingBalance) return;
    setEditingBalance(true);
    setSubmitError(null);
    try {
      const response = await fetch(
        `/api/admin/partner-credits/${encodeURIComponent(selectedPartner.userId)}/balance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newBalance: Number(currentEditBalance),
            note: `Admin edited partner balance to ${Number(currentEditBalance).toLocaleString()} cr`,
          }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { ok: true; transaction: CreditTransaction | null; balance: UserCreditBalance }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("ok" in result && result.ok)) {
        throw new Error(result && "error" in result && result.error ? result.error : "Failed to edit balance.");
      }

      setSelectedPartner((prev) =>
        prev && prev.userId === result.balance.userId ? { ...prev, ...result.balance } : prev,
      );
      setHistoryPage(1);
      router.refresh();
      setEditBalanceByPartner((prev) => ({ ...prev, [result.balance.userId]: String(result.balance.balance) }));
      setEditBalanceTouchedByPartner((prev) => ({ ...prev, [result.balance.userId]: false }));
      setIsEditingBalanceByPartner((prev) => ({ ...prev, [result.balance.userId]: false }));
      setSuccess(`Balance updated to ${result.balance.balance.toLocaleString()} credits for ${result.balance.userName}`);
      window.setTimeout(() => setSuccess(null), 3500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to edit balance.");
    } finally {
      setEditingBalance(false);
    }
  }

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner Credits</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Click any partner to view full detail, spending, credits history, and add credits.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by partner name, phone or id..."
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          />
        </div>
      </div>

      <div
        className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
        style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
      >
        <div className="min-w-[860px]">
          <div
            className="grid grid-cols-[minmax(90px,0.8fr)_minmax(160px,1.3fr)_minmax(120px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(110px,0.8fr)] items-center gap-x-4 border-b px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-white/70"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <span>Partner ID</span>
            <span>Partner</span>
            <span>Phone</span>
            <span className="justify-self-end text-right">Balance</span>
            <span className="justify-self-end text-right">Spent</span>
            <span className="justify-self-end text-right">Top-up</span>
          </div>
          {partners.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">No partners found.</div>
          ) : null}
          {partners.map((partner) => {
            return (
              <button
                key={partner.userId}
                type="button"
                onClick={() => {
                  setConfirmInlineOpen(false);
                  setSubmitError(null);
                  setAmountTouchedByPartner((prev) => ({ ...prev, [partner.userId]: false }));
                  setEditBalanceTouchedByPartner((prev) => ({ ...prev, [partner.userId]: false }));
                  setEditBalanceByPartner((prev) => ({ ...prev, [partner.userId]: String(partner.balance) }));
                  setIsEditingBalanceByPartner((prev) => ({ ...prev, [partner.userId]: false }));
                  setSelectedPartner(partner);
                }}
                className="grid w-full grid-cols-[minmax(90px,0.8fr)_minmax(160px,1.3fr)_minmax(120px,1fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(110px,0.8fr)] items-center gap-x-4 border-b px-4 py-3.5 text-left text-[15px] text-white/85 transition hover:bg-white/[0.04] last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <span className="font-mono text-[13px] text-white/70">{partner.userId}</span>
                <span className="font-semibold">{partner.userName}</span>
                <span className="text-white/70">{partner.userPhone}</span>
                <span className="justify-self-end text-right font-bold tabular-nums text-[#6EE7A8]">{partner.balance.toLocaleString()} cr</span>
                <span className="justify-self-end text-right tabular-nums font-semibold text-[#F18C8C]">-{partner.usage.toLocaleString()} cr</span>
                <span className="justify-self-end text-right tabular-nums text-white/85">{partner.topup.toLocaleString()} cr</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {partners.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No partners found.
          </p>
        ) : null}
        {partners.map((partner) => (
          <button
            key={partner.userId}
            type="button"
            onClick={() => {
              setConfirmInlineOpen(false);
              setSubmitError(null);
              setAmountTouchedByPartner((prev) => ({ ...prev, [partner.userId]: false }));
              setEditBalanceTouchedByPartner((prev) => ({ ...prev, [partner.userId]: false }));
              setEditBalanceByPartner((prev) => ({ ...prev, [partner.userId]: String(partner.balance) }));
              setIsEditingBalanceByPartner((prev) => ({ ...prev, [partner.userId]: false }));
              setSelectedPartner(partner);
            }}
            className="w-full rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04]"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <p className="text-[15px] font-bold text-white">{partner.userName}</p>
            <p className="font-mono text-[11px] text-white/55">{partner.userId}</p>
            <p className="mt-0.5 text-[12px] text-white/70">{partner.userPhone}</p>
            <p className="mt-2 text-[13px] font-bold text-[#6EE7A8]">{partner.balance.toLocaleString()} cr</p>
          </button>
        ))}
      </div>

      <AdminListPagination
        page={data.page}
        pageCount={pageCount}
        total={data.total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        pageNumbers={pageNumbers}
        noun="partners"
      />

      {selectedPartner ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close partner details"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={closePartnerDetailModal}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[720px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <button
              type="button"
              onClick={closePartnerDetailModal}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border text-[20px] font-semibold leading-none text-white transition hover:brightness-110"
              style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="flex items-start justify-between gap-3 pr-12 sm:pr-14">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Partner detail</p>
                <h2 className="mt-1 text-[18px] font-bold text-white sm:text-[22px]">{selectedPartner.userName}</h2>
                <p className="mt-1 font-mono text-[12px] text-white/60">{selectedPartner.userId}</p>
                <p className="mt-1 text-[12px] text-white/65">{selectedPartner.userPhone}</p>
              </div>
              <span className="rounded-full border px-3 py-1 text-[12px] font-semibold text-[#6EE7A8]" style={{ borderColor: "rgba(110,231,168,0.45)" }}>
                {selectedPartner.balance.toLocaleString()} cr
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article
                className="rounded-xl border px-3.5 py-3"
                style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Current Balance</p>
                  {!isEditingCurrentBalance ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: String(selectedPartner.balance) }));
                        setEditBalanceTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }));
                        setIsEditingBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: true }));
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-white/80 transition hover:bg-white/10"
                      style={{ borderColor: "rgba(255,255,255,0.25)" }}
                      aria-label="Edit current balance"
                      title="Edit current balance"
                    >
                      ✎
                    </button>
                  ) : null}
                </div>

                {!isEditingCurrentBalance ? (
                  <p className="mt-1 text-[14px] font-bold text-white">{selectedPartner.balance.toLocaleString()} cr</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={currentEditBalance}
                      onChange={(e) =>
                        setEditBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: e.target.value }))
                      }
                      onBlur={() =>
                        setEditBalanceTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: true }))
                      }
                      className="w-full rounded-lg border px-2.5 py-1.5 text-[13px] text-white outline-none"
                      style={{ borderColor: showEditBalanceError ? "#F18C8C" : theme.colors.outline, backgroundColor: "rgba(255,255,255,0.05)" }}
                    />
                    {showEditBalanceError ? (
                      <p className="text-[11px] text-[#F18C8C]">{editBalanceError}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditBalanceTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: true }));
                          if (!editBalanceError) void handleSaveEditedBalance();
                        }}
                        disabled={!!editBalanceError || editingBalance}
                        className="min-h-[30px] rounded-lg border px-2.5 text-[12px] font-semibold text-white disabled:opacity-45"
                        style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
                      >
                        {editingBalance ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsEditingBalanceByPartner((prev) => ({ ...prev, [selectedPartner.userId]: false }))
                        }
                        disabled={editingBalance}
                        className="min-h-[30px] rounded-lg border px-2.5 text-[12px] font-semibold text-white disabled:opacity-45"
                        style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
              <StatCard label="Total Top-up" value={`${partnerStats.topup.toLocaleString()} cr`} />
              <StatCard label="Total Usage" value={`-${partnerStats.usage.toLocaleString()} cr`} valueClassName="text-[#F18C8C]" />
            </div>

            {success ? (
              <p className="mt-3 rounded-xl border px-3.5 py-2.5 text-[13px] text-[#6EE7A8]" style={{ borderColor: "rgba(110,231,168,0.45)" }}>
                {success}
              </p>
            ) : null}
            {submitError ? (
              <p className="mt-3 rounded-xl border px-3.5 py-2.5 text-[13px] text-[#F18C8C]" style={{ borderColor: "rgba(241,140,140,0.45)" }}>
                {submitError}
              </p>
            ) : null}

            <div className="mt-4 rounded-xl border p-3.5 sm:p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <h3 className="mb-3 text-[14px] font-bold text-white">Add Credits</h3>
              <div>
                <label className="mb-1 block text-[11px] uppercase text-white/55">Credits Amount *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={currentAmount}
                  onChange={(e) =>
                    setAmountByPartner((prev) => ({ ...prev, [selectedPartner.userId]: e.target.value }))
                  }
                  onBlur={() =>
                    setAmountTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: true }))
                  }
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/40"
                  style={{ borderColor: showAmountError ? "#F18C8C" : theme.colors.outline, backgroundColor: "rgba(255,255,255,0.05)" }}
                />
                {showAmountError ? <p className="mt-1 text-[11px] text-[#F18C8C]">{amountError}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAmountTouchedByPartner((prev) => ({ ...prev, [selectedPartner.userId]: true }));
                  if (!hasErrors) setConfirmInlineOpen(true);
                }}
                disabled={hasErrors || submitting}
                className="mt-3 min-h-[42px] rounded-xl border px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                Add Credits
              </button>

              {confirmInlineOpen ? (
                <div className="mt-3 rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
                  <p className="text-[13px] text-white/85">
                    Add <span className="font-bold text-white">{Number(currentAmount).toLocaleString()} cr</span> to{" "}
                    <span className="font-bold text-white">{selectedPartner.userName}</span>?
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="min-h-[38px] rounded-lg border px-3 text-[13px] font-semibold text-white disabled:opacity-50"
                      style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
                    >
                      {submitting ? "Adding..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (submitting) return;
                        setConfirmInlineOpen(false);
                      }}
                      disabled={submitting}
                      className="min-h-[38px] rounded-lg border px-3 text-[13px] font-semibold text-white disabled:opacity-50"
                      style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border p-3.5 sm:p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <h3 className="mb-3 text-[14px] font-bold text-white">Credits History</h3>
              <div className="space-y-2">
                {historyLoading ? (
                  <p className="text-[12px] text-white/55">Loading transactions…</p>
                ) : null}
                {historyTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-white">{txn.note}</p>
                      <p className="text-[11px] text-white/55">{txn.createdAt} · {txn.id}</p>
                    </div>
                    <p className={`text-[13px] font-bold ${txn.amount >= 0 ? "text-[#6EE7A8]" : "text-[#F18C8C]"}`}>
                      {formatCredits(txn.amount)}
                    </p>
                  </div>
                ))}
                {!historyLoading && historyTransactions.length === 0 ? (
                  <p className="text-[12px] text-white/55">No transactions for this partner yet.</p>
                ) : null}
              </div>
              {historyTotal > 0 ? (
                <AdminListPagination
                  page={historyCurrentPage}
                  pageCount={historyPageCount}
                  total={historyTotal}
                  rangeStart={
                    historyTotal === 0 ? 0 : (historyCurrentPage - 1) * HISTORY_PAGE_SIZE + 1
                  }
                  rangeEnd={Math.min(historyCurrentPage * HISTORY_PAGE_SIZE, historyTotal)}
                  onPageChange={setHistoryPage}
                  pageNumbers={historyPageNumbers}
                  noun="transactions"
                />
              ) : null}
            </div>

          </section>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <article
      className="rounded-xl border px-3.5 py-3"
      style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
      <p className={`mt-1 text-[14px] font-bold text-white ${valueClassName ?? ""}`}>{value}</p>
    </article>
  );
}
