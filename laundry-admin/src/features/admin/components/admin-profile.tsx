"use client";

import { theme } from "@/lib/theme/theme";
import { useMemo, useState } from "react";

type AdminCard = {
  id: string;
  holderName: string;
  brand: "Visa" | "Mastercard" | "Amex";
  cardNumber: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
};

const cardShellStyle = {
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "rgba(0,0,0,0.04)",
} as const;

function formatCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function AdminProfile() {
  const [fullName, setFullName] = useState("Super Admin");
  const [email, setEmail] = useState("admin@autolaundry.com");
  const [phone, setPhone] = useState("+1 (555) 210-0000");

  const [cards, setCards] = useState<AdminCard[]>([
    {
      id: "CARD-1",
      holderName: "Super Admin",
      brand: "Visa",
      cardNumber: "4242 4242 4242 4242",
      expMonth: "08",
      expYear: "2029",
      isDefault: true,
    },
  ]);

  const [holderName, setHolderName] = useState("Super Admin");
  const [brand, setBrand] = useState<AdminCard["brand"]>("Visa");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("01");
  const [expYear, setExpYear] = useState("2028");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const years = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(start + i));
  }, []);

  const clearCardForm = () => {
    setEditingCardId(null);
    setHolderName(fullName);
    setBrand("Visa");
    setCardNumber("");
    setExpMonth("01");
    setExpYear(years[0] ?? "2028");
  };

  const openAddCardModal = () => {
    clearCardForm();
    setCardModalOpen(true);
  };

  const openCardForEdit = (card: AdminCard) => {
    setEditingCardId(card.id);
    setHolderName(card.holderName);
    setBrand(card.brand);
    setCardNumber(card.cardNumber);
    setExpMonth(card.expMonth);
    setExpYear(card.expYear);
    setCardModalOpen(true);
  };

  const handleSaveProfile = () => {
    setHint("Profile details updated for this demo session.");
    window.setTimeout(() => setHint(null), 2500);
  };

  const handleSaveCard = () => {
    const cleanCardNumber = cardNumber.replace(/\D/g, "");
    if (cleanCardNumber.length < 13) {
      setHint("Please enter a valid card number.");
      window.setTimeout(() => setHint(null), 2500);
      return;
    }
    if (editingCardId) {
      setCards((prev) =>
        prev.map((card) =>
          card.id === editingCardId
            ? {
                ...card,
                holderName: holderName.trim() || fullName,
                brand,
                cardNumber: formatCardNumberInput(cleanCardNumber),
                expMonth,
                expYear,
              }
            : card,
        ),
      );
      setHint("Card details updated.");
    } else {
      const newCard: AdminCard = {
        id: `CARD-${Date.now()}`,
        holderName: holderName.trim() || fullName,
        brand,
        cardNumber: formatCardNumberInput(cleanCardNumber),
        expMonth,
        expYear,
        isDefault: cards.length === 0,
      };
      setCards((prev) => [newCard, ...prev]);
      setHint("New card added.");
    }
    window.setTimeout(() => setHint(null), 2500);
    clearCardForm();
    setCardModalOpen(false);
  };

  const setDefaultCard = (id: string) => {
    setCards((prev) => prev.map((card) => ({ ...card, isDefault: card.id === id })));
    setHint("Default payout card changed.");
    window.setTimeout(() => setHint(null), 2500);
  };

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Profile</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Manage super admin identity and payout card details used by payment withdrawal flow.
        </p>
      </div>

      <section className="rounded-2xl border p-4 sm:p-6" style={cardShellStyle}>
        <h2 className="text-[16px] font-bold text-white sm:text-[17px]">Basic details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-full-name" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
              Full name
            </label>
            <input
              id="profile-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
              Phone
            </label>
            <input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleSaveProfile}
            className="h-10 rounded-full border px-5 text-[14px] font-semibold text-white sm:h-11"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
          >
            Save profile
          </button>
        </div>
      </section>

      <section className="rounded-2xl border p-4 sm:p-6" style={cardShellStyle}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-bold text-white sm:text-[17px]">Cards details</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-[12px] text-white/65 sm:text-[13px]">Used for super admin payout withdrawal destination.</p>
            <button
              type="button"
              onClick={openAddCardModal}
              className="h-9 rounded-full border px-4 text-[12px] font-semibold text-white"
              style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
            >
              Add card
            </button>
          </div>
        </div>

        <div className="scrollbar-hidden mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {cards.length === 0 ? (
            <p className="w-full rounded-xl border px-3 py-3 text-[13px] text-white/70" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              No card added yet.
            </p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="flex w-[min(100%,460px)] min-w-[320px] shrink-0 flex-col gap-3 rounded-xl border px-3 py-3"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <div
                  className="relative w-full overflow-hidden rounded-2xl border p-4 sm:max-w-[420px] sm:p-5"
                  style={{
                    borderColor: "rgba(171, 233, 254, 0.22)",
                    background: "linear-gradient(135deg, rgba(18,129,151,0.55), rgba(12,32,45,0.98))",
                    minHeight: "250px",
                  }}
                >
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {card.isDefault ? (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-[#ABE9FE]"
                        style={{ borderColor: "rgba(171, 233, 254, 0.45)" }}
                      >
                        Default
                      </span>
                    ) : null}
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-white/85">{card.brand}</span>
                  </div>
                  <div className="mt-6 h-9 w-14 rounded-md border border-white/35 bg-white/15" />
                  <p className="mt-6 font-mono text-[20px] tracking-[0.14em] text-white sm:text-[22px]">
                    {formatCardNumberInput(card.cardNumber)}
                  </p>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-white/60">Cardholder</p>
                      <p className="truncate text-[13px] font-semibold text-white">{card.holderName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-white/60">Expires</p>
                      <p className="text-[13px] font-semibold text-white">
                        {card.expMonth}/{card.expYear.slice(-2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openCardForEdit(card)}
                    className="h-9 rounded-full border px-4 text-[12px] font-semibold text-white"
                    style={{ borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    Edit
                  </button>
                  {!card.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefaultCard(card.id)}
                      className="h-9 rounded-full border px-4 text-[12px] font-semibold text-white"
                      style={{ borderColor: "rgba(171, 233, 254, 0.5)" }}
                    >
                      Set default
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="min-h-[1.5rem]">
        {hint ? (
          <p className="text-[12px] text-[#ABE9FE] sm:text-[13px]" role="status">
            {hint}
          </p>
        ) : null}
      </div>

      {cardModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close card modal"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => {
              setCardModalOpen(false);
              clearCardForm();
            }}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[560px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <h3 className="text-[18px] font-bold text-white sm:text-[22px]">{editingCardId ? "Edit card details" : "Add new card"}</h3>
            <div
              className="mt-4 mx-auto w-full max-w-[420px] rounded-2xl border px-4 py-4 sm:px-5"
              style={{
                borderColor: "rgba(171, 233, 254, 0.22)",
                background: "linear-gradient(135deg, rgba(18,129,151,0.55), rgba(12,32,45,0.98))",
                minHeight: "250px",
              }}
            >
              <span className="text-[12px] font-semibold uppercase tracking-wide text-white/80">{brand}</span>
              <div className="mt-4 h-9 w-14 rounded-md border border-white/35 bg-white/15" />
              <p className="mt-6 font-mono text-[20px] tracking-[0.14em] text-white">
                {formatCardNumberInput(cardNumber) || "•••• •••• •••• ••••"}
              </p>
              <div className="mt-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-white/60">Cardholder</p>
                  <p className="truncate text-[13px] font-semibold text-white">{holderName || "SUPER ADMIN"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-white/60">Expires</p>
                  <p className="text-[13px] font-semibold text-white">
                    {expMonth}/{expYear.slice(-2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="card-holder-name" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
                  Cardholder name
                </label>
                <input
                  id="card-holder-name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none"
                  style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
                />
              </div>
              <div>
                <label htmlFor="card-brand" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
                  Card brand
                </label>
                <select
                  id="card-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as AdminCard["brand"])}
                  className="admin-filter-select mt-1.5 w-full rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none"
                  style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">Amex</option>
                </select>
              </div>
              <div>
                <label htmlFor="card-number" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
                  Card number
                </label>
                <input
                  id="card-number"
                  value={cardNumber}
                  inputMode="numeric"
                  maxLength={23}
                  placeholder="1234 5678 9012 3456"
                  onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] text-white outline-none"
                  style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="card-exp-month" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
                    Exp month
                  </label>
                  <select
                    id="card-exp-month"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    className="admin-filter-select mt-1.5 w-full rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none"
                    style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const value = String(i + 1).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label htmlFor="card-exp-year" className="text-[12px] font-medium text-white/70 sm:text-[13px]">
                    Exp year
                  </label>
                  <select
                    id="card-exp-year"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    className="admin-filter-select mt-1.5 w-full rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none"
                    style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleSaveCard}
                className="h-10 w-full rounded-full border px-5 text-[15px] font-semibold text-white sm:h-11 sm:text-base"
                style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              >
                {editingCardId ? "Update card" : "Add card"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardModalOpen(false);
                  clearCardForm();
                }}
                className="h-10 w-full rounded-full border px-5 text-[15px] font-semibold text-white sm:h-11 sm:text-base"
                style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </section>
  );
}
