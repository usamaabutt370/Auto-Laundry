"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { theme } from "@/lib/theme/theme";
import { AdminListPagination } from "@/features/admin/components/admin-list-ui";
import type {
  CreditTransaction,
  CreditRequest,
  UserCreditBalance,
  CreditTransactionType,
  CreditRequestStatus,
} from "@/features/admin/types/admin-credits";
import { useMemo, useState } from "react";

type Tab = "transactions" | "add" | "requests";
type TypeFilter = "all" | CreditTransactionType;
type DateFilter = "all" | "week" | "month";
type ReqStatusFilter = "all" | CreditRequestStatus;

const PAGE_SIZE = 10;

const TYPE_PILL: Record<CreditTransactionType, { bg: string; fg: string; border: string; label: string }> = {
  topup:      { bg: "rgba(110,231,168,0.2)",   fg: "#6EE7A8", border: "rgba(110,231,168,0.45)",   label: "Top-up"     },
  usage:      { bg: "rgba(241,140,140,0.22)",  fg: "#F18C8C", border: "rgba(241,140,140,0.45)",   label: "Usage"      },
  refund:     { bg: "rgba(171,233,254,0.2)",   fg: "#ABE9FE", border: "rgba(171,233,254,0.45)",   label: "Refund"     },
  adjustment: { bg: "rgba(246,211,107,0.2)",   fg: "#F6D36B", border: "rgba(246,211,107,0.45)",   label: "Adjustment" },
};

const REQ_PILL: Record<CreditRequestStatus, { bg: string; fg: string; border: string }> = {
  pending:  { bg: "rgba(246,211,107,0.2)",  fg: "#F6D36B", border: "rgba(246,211,107,0.45)"  },
  approved: { bg: "rgba(110,231,168,0.2)",  fg: "#6EE7A8", border: "rgba(110,231,168,0.45)"  },
  rejected: { bg: "rgba(241,140,140,0.22)", fg: "#F18C8C", border: "rgba(241,140,140,0.45)"  },
};

type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
  placeholder: string;
};

const COUNTRIES: Country[] = [
  { code: "PK", name: "Pakistan",        dial: "+92",  flag: "🇵🇰", minDigits: 10, maxDigits: 10, placeholder: "3XX XXXXXXX"  },
  { code: "US", name: "United States",   dial: "+1",   flag: "🇺🇸", minDigits: 10, maxDigits: 10, placeholder: "XXX XXX XXXX" },
  { code: "GB", name: "United Kingdom",  dial: "+44",  flag: "🇬🇧", minDigits: 10, maxDigits: 11, placeholder: "XXXX XXXXXX"  },
  { code: "AE", name: "UAE",             dial: "+971", flag: "🇦🇪", minDigits:  9, maxDigits:  9, placeholder: "5X XXX XXXX"  },
  { code: "SA", name: "Saudi Arabia",    dial: "+966", flag: "🇸🇦", minDigits:  9, maxDigits:  9, placeholder: "5X XXX XXXX"  },
  { code: "IN", name: "India",           dial: "+91",  flag: "🇮🇳", minDigits: 10, maxDigits: 10, placeholder: "XXXXX XXXXX"  },
  { code: "CA", name: "Canada",          dial: "+1",   flag: "🇨🇦", minDigits: 10, maxDigits: 10, placeholder: "XXX XXX XXXX" },
  { code: "AU", name: "Australia",       dial: "+61",  flag: "🇦🇺", minDigits:  9, maxDigits:  9, placeholder: "XXX XXX XXX"  },
  { code: "DE", name: "Germany",         dial: "+49",  flag: "🇩🇪", minDigits: 10, maxDigits: 12, placeholder: "XXX XXXXXXXX" },
  { code: "FR", name: "France",          dial: "+33",  flag: "🇫🇷", minDigits:  9, maxDigits:  9, placeholder: "X XX XX XX XX"},
  { code: "TR", name: "Turkey",          dial: "+90",  flag: "🇹🇷", minDigits: 10, maxDigits: 10, placeholder: "5XX XXX XXXX" },
  { code: "OM", name: "Oman",            dial: "+968", flag: "🇴🇲", minDigits:  8, maxDigits:  8, placeholder: "XXXX XXXX"   },
  { code: "QA", name: "Qatar",           dial: "+974", flag: "🇶🇦", minDigits:  8, maxDigits:  8, placeholder: "XXXX XXXX"   },
  { code: "KW", name: "Kuwait",          dial: "+965", flag: "🇰🇼", minDigits:  8, maxDigits:  8, placeholder: "XXXX XXXX"   },
  { code: "BH", name: "Bahrain",         dial: "+973", flag: "🇧🇭", minDigits:  8, maxDigits:  8, placeholder: "XXXX XXXX"   },
  { code: "NG", name: "Nigeria",         dial: "+234", flag: "🇳🇬", minDigits: 10, maxDigits: 10, placeholder: "XXX XXX XXXX" },
  { code: "ZA", name: "South Africa",    dial: "+27",  flag: "🇿🇦", minDigits:  9, maxDigits:  9, placeholder: "XX XXX XXXX"  },
  { code: "BD", name: "Bangladesh",      dial: "+880", flag: "🇧🇩", minDigits: 10, maxDigits: 10, placeholder: "1XXX XXXXXX"  },
  { code: "LK", name: "Sri Lanka",       dial: "+94",  flag: "🇱🇰", minDigits:  9, maxDigits:  9, placeholder: "XX XXX XXXX"  },
  { code: "NP", name: "Nepal",           dial: "+977", flag: "🇳🇵", minDigits: 10, maxDigits: 10, placeholder: "98XX XXXXXX"  },
];

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";
const txnGridClass =
  "grid grid-cols-[minmax(80px,0.7fr)_minmax(130px,1.1fr)_minmax(120px,1fr)_minmax(100px,0.9fr)_minmax(80px,0.75fr)_minmax(130px,1.1fr)_minmax(90px,0.8fr)] items-center gap-x-3 gap-y-1";
const reqGridClass =
  "grid grid-cols-[minmax(80px,0.7fr)_minmax(130px,1.1fr)_minmax(130px,1fr)_minmax(100px,0.9fr)_minmax(90px,0.8fr)_minmax(160px,1.3fr)_minmax(100px,0.85fr)] items-center gap-x-3 gap-y-1";

function formatCredits(n: number) {
  const abs = Math.abs(n);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${abs.toLocaleString()} cr`;
}

function buildWhatsAppLink(phone: string, amount: number) {
  const clean = phone.replace(/\s+/g, "");
  const msg = encodeURIComponent(
    `Hi partner! We've received your request for ${amount} credits. Please transfer PKR ${amount} to:\n\nBank: HBL\nAccount Title: Auto Laundry\nAccount No: 1234-5678-9012\n\nOnce transferred, reply with your transaction ID and we'll add credits within 1 hour.`
  );
  return `https://wa.me/${clean.replace("+", "")}?text=${msg}`;
}

type CreditsListProps = {
  transactions: CreditTransaction[];
  requests: CreditRequest[];
  balances: UserCreditBalance[];
};

export function CreditsList({ transactions: initialTxns, requests: initialReqs, balances }: CreditsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  // ── Transactions tab state ──
  const [txnTypeFilter, setTxnTypeFilter] = useState<TypeFilter>("all");
  const [txnDateFilter, setTxnDateFilter] = useState<DateFilter>("all");
  const [txnQuery, setTxnQuery] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  const [transactions, setTransactions] = useState(initialTxns);

  // ── Add Credits tab state ──
  const [addUser, setAddUser] = useState("");
  const [addCountryCode, setAddCountryCode] = useState("PK");
  const [addPhone, setAddPhone] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addRef, setAddRef] = useState("");
  const [addTouched, setAddTouched] = useState({ user: false, phone: false, amount: false, note: false });
  const [addSubmitAttempted, setAddSubmitAttempted] = useState(false);
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // ── Requests tab state ──
  const [requests, setRequests] = useState(initialReqs);
  const [reqFilter, setReqFilter] = useState<ReqStatusFilter>("all");
  const [reqQuery, setReqQuery] = useState("");
  const [reqPage, setReqPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<CreditRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CreditRequest | null>(null);
  const [reqActionLoading, setReqActionLoading] = useState(false);

  // ── Summary numbers ──
  const totalIssued = useMemo(
    () => transactions.filter((t) => t.type === "topup").reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalUsed = useMemo(
    () => transactions.filter((t) => t.type === "usage").reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions],
  );
  const totalBalance = useMemo(() => balances.reduce((s, b) => s + b.balance, 0), [balances]);
  const pendingCount = useMemo(() => requests.filter((r) => r.status === "pending").length, [requests]);

  // ── Filtered transactions ──
  const filteredTxns = useMemo(() => {
    let list = [...transactions];
    if (txnTypeFilter !== "all") list = list.filter((t) => t.type === txnTypeFilter);
    if (txnQuery.trim()) {
      const q = txnQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userPhone.includes(q) ||
          (t.reference ?? "").toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q),
      );
    }
    if (txnDateFilter !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - (txnDateFilter === "week" ? 7 : 30));
      list = list.filter((t) => new Date(`${t.createdAt}T00:00:00`) >= cutoff);
    }
    return list;
  }, [transactions, txnTypeFilter, txnQuery, txnDateFilter]);

  const txnPageCount = Math.max(1, Math.ceil(filteredTxns.length / PAGE_SIZE));
  const txnCurrentPage = Math.min(txnPage, txnPageCount);
  const pagedTxns = useMemo(() => {
    const start = (txnCurrentPage - 1) * PAGE_SIZE;
    return filteredTxns.slice(start, start + PAGE_SIZE);
  }, [filteredTxns, txnCurrentPage]);

  // ── Filtered requests ──
  const filteredReqs = useMemo(() => {
    let list = [...requests];
    if (reqFilter !== "all") list = list.filter((r) => r.status === reqFilter);
    if (reqQuery.trim()) {
      const q = reqQuery.trim().toLowerCase();
      list = list.filter(
        (r) => r.userName.toLowerCase().includes(q) || r.userPhone.includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, reqFilter, reqQuery]);

  const reqPageCount = Math.max(1, Math.ceil(filteredReqs.length / PAGE_SIZE));
  const reqCurrentPage = Math.min(reqPage, reqPageCount);
  const pagedReqs = useMemo(() => {
    const start = (reqCurrentPage - 1) * PAGE_SIZE;
    return filteredReqs.slice(start, start + PAGE_SIZE);
  }, [filteredReqs, reqCurrentPage]);

  // ── Add Credits form validation ──
  const selectedCountry = COUNTRY_BY_CODE[addCountryCode] ?? COUNTRIES[0];
  const phoneDigitsOnly = addPhone.replace(/[\s\-()]/g, "");
      const addErrors = {
    user:   addUser.trim().length === 0 ? "Partner name is required" : "",
    phone:  addPhone.trim().length === 0
              ? "Phone number is required"
              : !/^\d+$/.test(phoneDigitsOnly)
              ? "Only digits, spaces, and dashes are allowed"
              : phoneDigitsOnly.length < selectedCountry.minDigits
              ? `Too short — ${selectedCountry.name} numbers need ${selectedCountry.minDigits === selectedCountry.maxDigits ? selectedCountry.minDigits : `${selectedCountry.minDigits}–${selectedCountry.maxDigits}`} digits`
              : phoneDigitsOnly.length > selectedCountry.maxDigits
              ? `Too long — ${selectedCountry.name} numbers need ${selectedCountry.minDigits === selectedCountry.maxDigits ? selectedCountry.minDigits : `${selectedCountry.minDigits}–${selectedCountry.maxDigits}`} digits`
              : "",
    amount: addAmount === ""
              ? "Credits amount is required"
              : Number(addAmount) <= 0
              ? "Amount must be greater than 0"
              : !Number.isInteger(Number(addAmount))
              ? "Amount must be a whole number"
              : "",
    note:   addNote.trim().length === 0 ? "Note / reason is required" : "",
  };
  const addHasErrors = Object.values(addErrors).some(Boolean);
  const canSubmitAdd = !addHasErrors && !addLoading;

  function showError(field: keyof typeof addErrors) {
    return (addTouched[field] || addSubmitAttempted) && addErrors[field];
  }

  const handleAddCredits = () => {
    setAddSubmitAttempted(true);
    if (addHasErrors || addLoading) return;
    setAddLoading(true);
    window.setTimeout(() => {
      const fullPhone = `${selectedCountry.dial} ${addPhone.trim()}`;
      const newTxn: CreditTransaction = {
        id: `TXN-${String(Date.now()).slice(-5)}`,
        userId: "manual",
        userName: addUser.trim(),
        userPhone: fullPhone,
        amount: Number(addAmount),
        type: "topup",
        note: addNote.trim(),
        adminName: "Admin",
        reference: addRef.trim() || null,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setTransactions((prev) => [newTxn, ...prev]);
      const name = addUser.trim();
      const amt = addAmount;
      setAddUser("");
      setAddCountryCode("PK");
      setAddPhone("");
      setAddAmount("");
      setAddNote("");
      setAddRef("");
      setAddTouched({ user: false, phone: false, amount: false, note: false });
      setAddSubmitAttempted(false);
      setAddConfirmOpen(false);
      setAddLoading(false);
      setAddSuccess(`${Number(amt).toLocaleString()} credits added to ${name}`);
      window.setTimeout(() => setAddSuccess(null), 4000);
    }, 700);
  };

  // ── Request approve/reject ──
  const handleApprove = () => {
    if (!approveTarget || reqActionLoading) return;
    setReqActionLoading(true);
    window.setTimeout(() => {
      const req = approveTarget;
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "approved" } : r)));
      const newTxn: CreditTransaction = {
        id: `TXN-${String(Date.now()).slice(-5)}`,
        userId: req.userId,
        userName: req.userName,
        userPhone: req.userPhone,
        amount: req.amountRequested,
        type: "topup",
        note: `Partner credit request approved (${req.id})`,
        adminName: "Admin",
        reference: req.id,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setTransactions((prev) => [newTxn, ...prev]);
      setApproveTarget(null);
      setReqActionLoading(false);
    }, 700);
  };

  const handleReject = () => {
    if (!rejectTarget || reqActionLoading) return;
    setReqActionLoading(true);
    window.setTimeout(() => {
      setRequests((prev) => prev.map((r) => (r.id === rejectTarget.id ? { ...r, status: "rejected" } : r)));
      setRejectTarget(null);
      setReqActionLoading(false);
    }, 500);
  };

  // ── Pagination helpers ──
  function pageNumbers(current: number, total: number) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const nums: number[] = [];
    const ws = Math.max(2, current - 1);
    const we = Math.min(total - 1, current + 1);
    nums.push(1);
    if (ws > 2) nums.push(-1);
    for (let n = ws; n <= we; n++) nums.push(n);
    if (we < total - 1) nums.push(-1);
    nums.push(total);
    return nums;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "transactions", label: "Transactions" },
    { key: "add",          label: "Add Credits" },
    { key: "requests",     label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
  ];

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Partner Credits</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Manage partner credit balances. Partners request credits via WhatsApp, pay manually, and admin adds credits here.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Credits Issued",   value: `${totalIssued.toLocaleString()} cr`,   icon: "↑" },
          { label: "Total Credits Used",     value: `${totalUsed.toLocaleString()} cr`,     icon: "↓" },
          { label: "Total Active Balance",   value: `${totalBalance.toLocaleString()} cr`,  icon: "◎" },
          { label: "Pending Requests",       value: String(pendingCount),                   icon: "⏳" },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-xl border px-4 py-3.5"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[18px] leading-none text-white/60">{card.icon}</span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{card.label}</p>
            </div>
            <p className="mt-2 text-[22px] font-bold tabular-nums text-white">{card.value}</p>
          </article>
        ))}
      </section>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="relative px-4 pb-3 pt-2 text-[13px] font-semibold transition sm:text-[14px]"
            style={{ color: activeTab === tab.key ? "#ABE9FE" : "rgba(255,255,255,0.55)" }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute bottom-0 left-0 h-[2px] w-full rounded-full"
                style={{ backgroundColor: "#ABE9FE" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3 sm:space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={txnQuery}
                onChange={(e) => { setTxnQuery(e.target.value); setTxnPage(1); }}
                placeholder="Search by partner, ID, reference…"
                className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
              />
            </div>
            <select
              value={txnTypeFilter}
              onChange={(e) => { setTxnTypeFilter(e.target.value as TypeFilter); setTxnPage(1); }}
              className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[160px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            >
              <option value="all">All types</option>
              <option value="topup">Top-up</option>
              <option value="usage">Usage</option>
              <option value="refund">Refund</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <select
              value={txnDateFilter}
              onChange={(e) => { setTxnDateFilter(e.target.value as DateFilter); setTxnPage(1); }}
              className="admin-filter-select min-h-[44px] w-full cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:w-[150px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            >
              <option value="all">All dates</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>

          {/* Desktop table */}
          <div
            className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <div className="min-w-[900px]">
              <div
                className={`sticky top-0 z-[1] ${txnGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70`}
                style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: theme.colors.sidebarBackground }}
              >
                <span>TXN ID</span>
                <span>Partner</span>
                <span>Phone</span>
                <span>Type</span>
                <span className="text-right">Amount</span>
                <span>Note</span>
                <span className="text-right">Date</span>
              </div>
              {pagedTxns.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-white/60">No transactions match your filters.</div>
              ) : null}
              {pagedTxns.map((txn) => (
                <div
                  key={txn.id}
                  className={`${txnGridClass} border-b px-4 py-2.5 text-[13px] text-white/85 last:border-b-0`}
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <span className="font-mono text-[11px] text-white/70">{txn.id}</span>
                  <span className="font-semibold text-white">{txn.userName}</span>
                  <span className="text-white/70">{txn.userPhone}</span>
                  <div>
                    <span
                      className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                      style={{
                        backgroundColor: TYPE_PILL[txn.type].bg,
                        color: TYPE_PILL[txn.type].fg,
                        borderColor: TYPE_PILL[txn.type].border,
                      }}
                    >
                      {TYPE_PILL[txn.type].label}
                    </span>
                  </div>
                  <span
                    className={`text-right font-bold tabular-nums ${txn.amount > 0 ? "text-[#6EE7A8]" : "text-[#F18C8C]"}`}
                  >
                    {formatCredits(txn.amount)}
                  </span>
                  <span className="min-w-0 truncate text-[12px] text-white/65" title={txn.note}>
                    {txn.note}
                  </span>
                  <span className="text-right tabular-nums text-white/65">{txn.createdAt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {pagedTxns.length === 0 ? (
              <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
                No transactions match your filters.
              </p>
            ) : null}
            {pagedTxns.map((txn) => (
              <article
                key={txn.id}
                className="rounded-xl border p-3.5"
                style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-white">{txn.userName}</p>
                    <p className="font-mono text-[11px] text-white/55">{txn.id}</p>
                  </div>
                  <span
                    className={`text-[16px] font-bold tabular-nums ${txn.amount > 0 ? "text-[#6EE7A8]" : "text-[#F18C8C]"}`}
                  >
                    {formatCredits(txn.amount)}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: TYPE_PILL[txn.type].bg,
                      color: TYPE_PILL[txn.type].fg,
                      borderColor: TYPE_PILL[txn.type].border,
                    }}
                  >
                    {TYPE_PILL[txn.type].label}
                  </span>
                  <span className="text-[12px] text-white/55">{txn.createdAt}</span>
                </div>
                <p className="mt-2 text-[12px] text-white/65">{txn.note}</p>
                {txn.reference ? (
                  <p className="mt-1 font-mono text-[11px] text-white/45">Ref: {txn.reference}</p>
                ) : null}
              </article>
            ))}
          </div>

          {/* Pagination */}
          <AdminListPagination
            page={txnCurrentPage}
            pageCount={txnPageCount}
            total={filteredTxns.length}
            rangeStart={filteredTxns.length === 0 ? 0 : (txnCurrentPage - 1) * PAGE_SIZE + 1}
            rangeEnd={Math.min(txnCurrentPage * PAGE_SIZE, filteredTxns.length)}
            onPageChange={setTxnPage}
            pageNumbers={pageNumbers(txnCurrentPage, txnPageCount)}
          />
        </div>
      )}

      {/* ── ADD CREDITS TAB ── */}
      {activeTab === "add" && (
        <div className="space-y-4">
          {addSuccess ? (
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3.5"
              style={{ borderColor: "rgba(110,231,168,0.45)", backgroundColor: "rgba(110,231,168,0.1)" }}
            >
              <span className="text-[18px] text-[#6EE7A8]">✓</span>
              <p className="text-[13px] font-semibold text-[#6EE7A8] sm:text-[14px]">{addSuccess}</p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Form */}
            <div
              className="rounded-xl border p-4 sm:p-5"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            >
              <h2 className="mb-4 text-[15px] font-bold text-white sm:text-[17px]">Add Credits to Partner</h2>

              <div className="space-y-3.5">
                {/* User Name */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Partner Name / ID <span className="text-[#F18C8C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addUser}
                    onChange={(e) => setAddUser(e.target.value)}
                    onBlur={() => setAddTouched((p) => ({ ...p, user: true }))}
                    placeholder="e.g. CleanPro Laundry or partner-id"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    style={{
                      borderColor: showError("user") ? "#F18C8C" : theme.colors.outline,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  />
                  {showError("user") && (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-[#F18C8C]">
                      <span aria-hidden>⚠</span> {addErrors.user}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Phone Number <span className="text-[#F18C8C]">*</span>
                  </label>
                  <div
                    className="flex overflow-hidden rounded-xl border transition-colors"
                    style={{
                      borderColor: showError("phone") ? "#F18C8C" : theme.colors.outline,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Country code picker */}
                    <div className="flex shrink-0 items-center border-r" style={{ borderColor: showError("phone") ? "#F18C8C" : theme.colors.outline }}>
                      <select
                        value={addCountryCode}
                        onChange={(e) => {
                          setAddCountryCode(e.target.value);
                          setAddPhone("");
                          setAddTouched((p) => ({ ...p, phone: false }));
                        }}
                        className="admin-filter-select h-full cursor-pointer bg-transparent py-2.5 pl-3 pr-3 text-[13px] font-semibold text-white outline-none"
                        aria-label="Country code"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Number input */}
                    <input
                      type="tel"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value.replace(/[^\d\s\-()]/g, ""))}
                      onBlur={() => setAddTouched((p) => ({ ...p, phone: true }))}
                      placeholder={selectedCountry.placeholder}
                      maxLength={selectedCountry.maxDigits + 4}
                      className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/35"
                    />
                  </div>

                  {/* Hint or error */}
                  {showError("phone") ? (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-[#F18C8C]">
                      <span aria-hidden>⚠</span> {addErrors.phone}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/40">
                      {selectedCountry.flag} {selectedCountry.name} · {selectedCountry.dial} · {selectedCountry.minDigits === selectedCountry.maxDigits ? `${selectedCountry.minDigits} digits` : `${selectedCountry.minDigits}–${selectedCountry.maxDigits} digits`}
                      {phoneDigitsOnly.length > 0 ? ` · ${phoneDigitsOnly.length} entered` : ""}
                    </p>
                  )}
                </div>

                {/* Credits Amount */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Credits Amount <span className="text-[#F18C8C]">*</span>
                  </label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    onBlur={() => setAddTouched((p) => ({ ...p, amount: true }))}
                    placeholder="e.g. 500"
                    min="1"
                    step="1"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    style={{
                      borderColor: showError("amount") ? "#F18C8C" : theme.colors.outline,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  />
                  {showError("amount") ? (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-[#F18C8C]">
                      <span aria-hidden>⚠</span> {addErrors.amount}
                    </p>
                  ) : addAmount && Number(addAmount) > 0 ? (
                    <p className="mt-1 text-[12px] text-white/50">
                      = PKR {Number(addAmount).toLocaleString()} (1 credit = 1 PKR)
                    </p>
                  ) : null}
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Note / Reason <span className="text-[#F18C8C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                    onBlur={() => setAddTouched((p) => ({ ...p, note: true }))}
                    placeholder="e.g. HBL transfer confirmed — PKR 500"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    style={{
                      borderColor: showError("note") ? "#F18C8C" : theme.colors.outline,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  />
                  {showError("note") && (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-[#F18C8C]">
                      <span aria-hidden>⚠</span> {addErrors.note}
                    </p>
                  )}
                </div>

                {/* Transaction Reference (optional) */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Transaction Reference <span className="text-white/35">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addRef}
                    onChange={(e) => setAddRef(e.target.value)}
                    placeholder="e.g. HBL-TXN-992312"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    style={{ borderColor: theme.colors.outline, backgroundColor: "rgba(255,255,255,0.05)" }}
                  />
                </div>

                {/* Submit */}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAddSubmitAttempted(true);
                      if (!addHasErrors) setAddConfirmOpen(true);
                    }}
                    disabled={addLoading}
                    className="min-h-[44px] w-full rounded-xl border px-5 text-[14px] font-semibold text-white transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                    style={{
                      borderColor: theme.colors.filledButtonBorder,
                      backgroundColor: theme.colors.secondary,
                    }}
                  >
                    Add Credits
                  </button>
                  {addSubmitAttempted && addHasErrors && (
                    <p className="text-[12px] text-[#F18C8C]">Please fix the errors above before continuing.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Partner balances reference */}
            <div
              className="rounded-xl border p-4 sm:p-5"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            >
              <h2 className="mb-3 text-[15px] font-bold text-white sm:text-[17px]">Current Partner Balances</h2>
              <div className="space-y-2">
                {balances.map((b) => (
                  <div
                    key={b.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">{b.userName}</p>
                      <p className="text-[11px] text-white/50">{b.userPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold tabular-nums text-[#6EE7A8]">
                        {b.balance.toLocaleString()} cr
                      </p>
                      {b.lastTopupAt ? (
                        <p className="text-[10px] text-white/40">Last: {b.lastTopupAt}</p>
                      ) : (
                        <p className="text-[10px] text-white/30">No top-up yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <div className="space-y-3 sm:space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={reqQuery}
                onChange={(e) => { setReqQuery(e.target.value); setReqPage(1); }}
                placeholder="Search by partner or request ID…"
                className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setReqFilter(s); setReqPage(1); }}
                  className="inline-flex min-h-[40px] items-center rounded-full border px-3.5 py-2 text-[12px] font-semibold transition sm:px-4 sm:text-[13px]"
                  style={{
                    borderColor: theme.colors.filledButtonBorder,
                    backgroundColor: reqFilter === s ? theme.colors.secondary : "transparent",
                    color: theme.colors.themeWhite,
                    ...(reqFilter !== s ? { boxShadow: "inset 0 0 0 1px rgba(160,208,233,0.25)" } : {}),
                  }}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div
            className="scrollbar-hidden hidden min-w-0 overflow-x-auto rounded-xl border md:block [-webkit-overflow-scrolling:touch]"
            style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
          >
            <div className="min-w-[960px]">
              <div
                className={`sticky top-0 z-[1] ${reqGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70`}
                style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: theme.colors.sidebarBackground }}
              >
                <span>Req ID</span>
                <span>Partner</span>
                <span>Phone</span>
                <span className="text-right">Amount</span>
                <span>Status</span>
                <span>Note</span>
                <span className="text-right">Actions</span>
              </div>
              {pagedReqs.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-white/60">No requests match your filters.</div>
              ) : null}
              {pagedReqs.map((req) => (
                <div
                  key={req.id}
                  className={`${reqGridClass} border-b px-4 py-2.5 text-[13px] text-white/85 last:border-b-0`}
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <span className="font-mono text-[11px] text-white/70">{req.id}</span>
                  <span className="font-semibold text-white">{req.userName}</span>
                  <span className="text-white/70">{req.userPhone}</span>
                  <span className="text-right font-bold tabular-nums text-white">
                    {req.amountRequested.toLocaleString()} cr
                  </span>
                  <div>
                    <span
                      className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                      style={{
                        backgroundColor: REQ_PILL[req.status].bg,
                        color: REQ_PILL[req.status].fg,
                        borderColor: REQ_PILL[req.status].border,
                      }}
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  <span className="min-w-0 truncate text-[12px] text-white/55" title={req.whatsappNote ?? "—"}>
                    {req.whatsappNote ?? "—"}
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={buildWhatsAppLink(req.userPhone, req.amountRequested)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center rounded-lg border px-2 text-[11px] font-semibold text-white transition hover:brightness-110"
                      style={{ borderColor: "rgba(37,211,102,0.5)", backgroundColor: "rgba(37,211,102,0.15)", color: "#25D366" }}
                    >
                      WhatsApp
                    </a>
                    {req.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setApproveTarget(req)}
                          className="inline-flex h-7 items-center rounded-lg border px-2 text-[11px] font-semibold transition hover:brightness-110"
                          style={{ borderColor: "rgba(110,231,168,0.45)", backgroundColor: "rgba(110,231,168,0.15)", color: "#6EE7A8" }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectTarget(req)}
                          className="inline-flex h-7 items-center rounded-lg border px-2 text-[11px] font-semibold transition hover:brightness-110"
                          style={{ borderColor: "rgba(241,140,140,0.45)", backgroundColor: "rgba(241,140,140,0.15)", color: "#F18C8C" }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile request cards */}
          <div className="grid gap-3 md:hidden">
            {pagedReqs.length === 0 ? (
              <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
                No requests match your filters.
              </p>
            ) : null}
            {pagedReqs.map((req) => (
              <article
                key={req.id}
                className="rounded-xl border p-3.5"
                style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-white">{req.userName}</p>
                    <p className="text-[12px] text-white/60">{req.userPhone}</p>
                    <p className="font-mono text-[11px] text-white/40">{req.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-bold tabular-nums text-white">
                      {req.amountRequested.toLocaleString()} cr
                    </p>
                    <span
                      className={`${statusPillClass} mt-1 inline-flex rounded-full py-1 pl-2.5 pr-3`}
                      style={{
                        backgroundColor: REQ_PILL[req.status].bg,
                        color: REQ_PILL[req.status].fg,
                        borderColor: REQ_PILL[req.status].border,
                      }}
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                </div>
                {req.whatsappNote ? (
                  <p className="mt-2 text-[12px] text-white/55">{req.whatsappNote}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={buildWhatsAppLink(req.userPhone, req.amountRequested)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition hover:brightness-110"
                    style={{ borderColor: "rgba(37,211,102,0.5)", backgroundColor: "rgba(37,211,102,0.15)", color: "#25D366" }}
                  >
                    WhatsApp
                  </a>
                  {req.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setApproveTarget(req)}
                        className="inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition hover:brightness-110"
                        style={{ borderColor: "rgba(110,231,168,0.45)", backgroundColor: "rgba(110,231,168,0.15)", color: "#6EE7A8" }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(req)}
                        className="inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition hover:brightness-110"
                        style={{ borderColor: "rgba(241,140,140,0.45)", backgroundColor: "rgba(241,140,140,0.15)", color: "#F18C8C" }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Requests pagination */}
          <AdminListPagination
            page={reqCurrentPage}
            pageCount={reqPageCount}
            total={filteredReqs.length}
            rangeStart={filteredReqs.length === 0 ? 0 : (reqCurrentPage - 1) * PAGE_SIZE + 1}
            rangeEnd={Math.min(reqCurrentPage * PAGE_SIZE, filteredReqs.length)}
            onPageChange={setReqPage}
            pageNumbers={pageNumbers(reqCurrentPage, reqPageCount)}
          />
        </div>
      )}

      {/* ── Confirm: Add Credits ── */}
      <ConfirmModal
        open={addConfirmOpen}
        title="Confirm Add Credits"
        description={`Add ${Number(addAmount).toLocaleString()} credits to "${addUser.trim()}"? Note: ${addNote.trim()}`}
        confirmLabel={addLoading ? "Adding…" : "Confirm"}
        cancelLabel="Cancel"
        onConfirm={handleAddCredits}
        onCancel={() => { if (!addLoading) setAddConfirmOpen(false); }}
      />

      {/* ── Confirm: Approve Request ── */}
      <ConfirmModal
        open={!!approveTarget}
        title="Approve Credit Request"
        description={`Approve ${approveTarget?.amountRequested.toLocaleString()} credits for ${approveTarget?.userName}? This will also create a top-up transaction for this partner.`}
        confirmLabel={reqActionLoading ? "Approving…" : "Approve"}
        cancelLabel="Cancel"
        onConfirm={handleApprove}
        onCancel={() => { if (!reqActionLoading) setApproveTarget(null); }}
      />

      {/* ── Confirm: Reject Request ── */}
      <ConfirmModal
        open={!!rejectTarget}
        title="Reject Credit Request"
        description={`Reject partner credit request from ${rejectTarget?.userName}? This action cannot be undone.`}
        confirmLabel={reqActionLoading ? "Rejecting…" : "Reject"}
        cancelLabel="Cancel"
        onConfirm={handleReject}
        onCancel={() => { if (!reqActionLoading) setRejectTarget(null); }}
      />
    </section>
  );
}
