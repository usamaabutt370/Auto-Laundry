// Central in-memory "backend" for admin demo screens.
// All admin screens should pull their data from here so the UI behaves like it
// is connected to real APIs.

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Pending" | "Blocked";
  orders: number;
  joinedAt: string;
};

export type OrderStatus =
  | "Placed"
  | "Accepted"
  | "In Progress"
  | "Ready"
  | "Delivered"
  | "Cancelled";

export type ShippingService = "Standard" | "Priority" | "Express";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  partner: string;
  items: string;
  itemCount: number;
  shippingService: ShippingService;
  trackingCode: string;
  total: string;
  status: OrderStatus;
  createdAt: string;
};

export type ServiceBreakdown = {
  label: string;
  count: number;
};

export type DashboardOverviewMetric = {
  id: string;
  title: string;
  total: number;
  services: ServiceBreakdown[];
};

export type DashboardDemoData = {
  title: string;
  userCount: number;
  timeFilter: "Week" | "Month" | "Year";
  overviewCards: DashboardOverviewMetric[];
  summaryCards: { id: string; label: string; value: string }[];
  balance: { amount: string; labels: string[]; points: number[] };
};

// -----------------------------
// Users demo data
// -----------------------------

const SEEDED_USERS: AdminUser[] = [
  {
    id: "USR-1001",
    name: "Olivia Brown",
    email: "olivia.brown@gmail.com",
    phone: "+1 (555) 214-9001",
    status: "Active",
    orders: 24,
    joinedAt: "2026-01-05",
  },
  {
    id: "USR-1002",
    name: "Ethan Walker",
    email: "ethan.walker@gmail.com",
    phone: "+1 (555) 214-9020",
    status: "Pending",
    orders: 7,
    joinedAt: "2026-01-12",
  },
  {
    id: "USR-1003",
    name: "Sophia Carter",
    email: "sophia.carter@gmail.com",
    phone: "+1 (555) 214-9033",
    status: "Active",
    orders: 31,
    joinedAt: "2025-12-20",
  },
  {
    id: "USR-1004",
    name: "Liam Johnson",
    email: "liam.johnson@gmail.com",
    phone: "+1 (555) 214-9042",
    status: "Blocked",
    orders: 2,
    joinedAt: "2026-02-02",
  },
  {
    id: "USR-1005",
    name: "Ava Wilson",
    email: "ava.wilson@gmail.com",
    phone: "+1 (555) 214-9058",
    status: "Active",
    orders: 16,
    joinedAt: "2026-02-08",
  },
];

const FIRST_NAMES = [
  "Noah",
  "Mia",
  "James",
  "Emma",
  "Lucas",
  "Charlotte",
  "Benjamin",
  "Amelia",
  "Henry",
  "Harper",
  "Alexander",
  "Evelyn",
  "Daniel",
  "Abigail",
  "Matthew",
  "Ella",
  "Jackson",
  "Scarlett",
  "Sebastian",
  "Grace",
  "Jack",
  "Chloe",
  "Owen",
  "Victoria",
  "Samuel",
  "Riley",
  "David",
  "Aria",
  "Joseph",
  "Lily",
  "Carter",
  "Zoey",
  "Wyatt",
  "Nora",
  "Gabriel",
  "Hannah",
  "Julian",
  "Layla",
  "Levi",
  "Penelope",
];

const LAST_NAMES = [
  "Martinez",
  "Garcia",
  "Rodriguez",
  "Lee",
  "Kim",
  "Patel",
  "Nguyen",
  "Singh",
  "Cohen",
  "Khan",
  "Silva",
  "Costa",
  "Reyes",
  "Foster",
  "Brooks",
  "Gray",
  "James",
  "Bennett",
  "Ross",
  "Hughes",
  "Price",
  "Sanders",
  "Perry",
  "Powell",
  "Long",
  "Patterson",
  "Hughes",
  "Flores",
  "Washington",
  "Butler",
  "Simmons",
  "Foster",
  "Gonzalez",
  "Bryant",
  "Alexander",
  "Russell",
  "Griffin",
  "Diaz",
  "Hayes",
  "Myers",
];

const STATUSES: AdminUser["status"][] = ["Active", "Pending", "Blocked"];

const EXTRA_USERS: AdminUser[] = Array.from({ length: 45 }, (_, index) => {
  const idNum = 1006 + index;
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 3) % LAST_NAMES.length];
  const name = `${first} ${last}`;
  const slug = `${first}.${last}.${idNum}`.toLowerCase().replace(/\s+/g, "");

  return {
    id: `USR-${idNum}`,
    name,
    email: `${slug}@example.com`,
    phone: `+1 (555) 3${String(10 + (index % 89)).padStart(2, "0")}-${String(
      2000 + index
    ).slice(-4)}`,
    status: STATUSES[index % STATUSES.length],
    orders: (index * 7 + 3) % 52,
    joinedAt: `2025-${String((index % 12) + 1).padStart(2, "0")}-${String(
      (index % 27) + 1
    ).padStart(2, "0")}`,
  };
});

const DEMO_USERS: AdminUser[] = [...SEEDED_USERS, ...EXTRA_USERS];

export async function fetchUsersDemoData(): Promise<AdminUser[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return DEMO_USERS;
}

// -----------------------------
// Orders demo data
// -----------------------------

const ORDER_STATUSES: OrderStatus[] = [
  "Placed",
  "Accepted",
  "In Progress",
  "Ready",
  "Delivered",
  "Cancelled",
];

const SERVICES: ShippingService[] = ["Standard", "Priority", "Express"];

const SEEDED_ORDERS: AdminOrder[] = [
  {
    id: "ORD-24001",
    orderNumber: "59217342",
    customer: "Olivia Brown",
    partner: "Sparkle Wash Co.",
    items: "Wash & Fold · 2 bags",
    itemCount: 2,
    shippingService: "Standard",
    trackingCode: "940010010938113203113",
    total: "$48.00",
    status: "Delivered",
    createdAt: "2026-04-01",
  },
  {
    id: "ORD-24002",
    orderNumber: "59217343",
    customer: "Ethan Walker",
    partner: "HomeFresh Laundry",
    items: "Dry Cleaning · 5 pcs",
    itemCount: 5,
    shippingService: "Priority",
    trackingCode: "940010010938113203114",
    total: "$62.50",
    status: "In Progress",
    createdAt: "2026-04-02",
  },
  {
    id: "ORD-24003",
    orderNumber: "59217344",
    customer: "Sophia Carter",
    partner: "Sparkle Wash Co.",
    items: "Wash & Fold · 1 bag",
    itemCount: 1,
    shippingService: "Express",
    trackingCode: "940010010938113203115",
    total: "$28.00",
    status: "Ready",
    createdAt: "2026-04-02",
  },
  {
    id: "ORD-24004",
    orderNumber: "59217345",
    customer: "Liam Johnson",
    partner: "QuickPress",
    items: "Tailoring · 1 item",
    itemCount: 1,
    shippingService: "Standard",
    trackingCode: "940010010938113203116",
    total: "$35.00",
    status: "Placed",
    createdAt: "2026-04-03",
  },
  {
    id: "ORD-24005",
    orderNumber: "59217346",
    customer: "Ava Wilson",
    partner: "HomeFresh Laundry",
    items: "Mixed · 3 services",
    itemCount: 3,
    shippingService: "Priority",
    trackingCode: "940010010938113203117",
    total: "$91.25",
    status: "Accepted",
    createdAt: "2026-04-03",
  },
];

const CUSTOMERS = [
  "Mia Garcia",
  "Noah Kim",
  "Emma Patel",
  "Lucas Nguyen",
  "Charlotte Lee",
  "Benjamin Ross",
  "Amelia Foster",
  "Henry Brooks",
];

const PARTNERS = [
  "Sparkle Wash Co.",
  "HomeFresh Laundry",
  "QuickPress",
  "City Suds",
  "Blue Tide",
];

const ITEMS = [
  "Wash & Fold · 1 bag",
  "Wash & Fold · 2 bags",
  "Dry Cleaning · 3 pcs",
  "Dry Cleaning · 6 pcs",
  "Mixed · 2 services",
  "Tailoring · 2 items",
];

function randomFrom<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function fakeTracking(seed: number): string {
  const base = 940010010938000000000 + (seed % 999999);
  return String(base);
}

const EXTRA_ORDERS: AdminOrder[] = Array.from({ length: 42 }, (_, index) => {
  const n = 24006 + index;
  const id = `ORD-${n}`;
  const month = 1 + (index % 12);
  const day = 1 + (index % 28);
  const status = ORDER_STATUSES[index % ORDER_STATUSES.length];
  const base = 24 + (index % 80);
  const cents = (index * 17) % 100;
  const itemCount = 1 + (index % 12);

  return {
    id,
    orderNumber: String(59217000 + index),
    customer: randomFrom(CUSTOMERS, index + 3),
    partner: randomFrom(PARTNERS, index + 7),
    items: randomFrom(ITEMS, index + 11),
    itemCount,
    shippingService: randomFrom(SERVICES, index + 13),
    trackingCode: fakeTracking(index + n),
    total: `$${base}.${String(cents).padStart(2, "0")}`,
    status,
    createdAt: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
});

const DEMO_ORDERS: AdminOrder[] = [...SEEDED_ORDERS, ...EXTRA_ORDERS];

export async function fetchOrdersDemoData(): Promise<AdminOrder[]> {
  await new Promise((resolve) => setTimeout(resolve, 90));
  return DEMO_ORDERS;
}

// -----------------------------
// Partner KYC demo data
// -----------------------------

export type PartnerKycStatus = "Pending" | "Approved" | "Rejected";

export type AdminPartnerKyc = {
  id: string;
  partnerName: string;
  businessName: string;
  email: string;
  phone: string;
  status: PartnerKycStatus;
  submittedAt: string;
  /** Short labels for demo (real app would link to stored files). */
  documentsSummary: string;
  /** Services this partner offers (shown in Admin review modal). */
  services: string[];
};

const LAUNDRY_SERVICE_POOL = [
  "Wash & fold",
  "Dry cleaning",
  "Ironing / pressing",
  "Stain treatment",
  "Pickup & delivery",
  "Express same-day",
  "Commercial / bulk",
  "Alterations & tailoring",
  "Shoe cleaning",
  "Bedding & household",
] as const;

const SEEDED_PARTNER_KYC: AdminPartnerKyc[] = [
  {
    id: "KYC-24001",
    partnerName: "Maria Santos",
    businessName: "Sparkle Wash Co.",
    email: "maria@sparklewash.example.com",
    phone: "+1 (555) 201-4401",
    status: "Pending",
    submittedAt: "2026-04-01",
    documentsSummary: "Gov ID · Business license · Bank (last 4)",
    services: ["Wash & fold", "Dry cleaning", "Pickup & delivery", "Express same-day"],
  },
  {
    id: "KYC-24002",
    partnerName: "James Chen",
    businessName: "HomeFresh Laundry",
    email: "james@homefresh.example.com",
    phone: "+1 (555) 201-4402",
    status: "Approved",
    submittedAt: "2026-03-28",
    documentsSummary: "Gov ID · Tax ID · Bank (last 4)",
    services: ["Wash & fold", "Dry cleaning", "Ironing / pressing", "Pickup & delivery", "Commercial / bulk"],
  },
  {
    id: "KYC-24003",
    partnerName: "Priya Nair",
    businessName: "QuickPress",
    email: "priya@quickpress.example.com",
    phone: "+1 (555) 201-4403",
    status: "Pending",
    submittedAt: "2026-04-02",
    documentsSummary: "Gov ID · Utility bill · Bank (last 4)",
    services: ["Wash & fold", "Dry cleaning", "Stain treatment"],
  },
  {
    id: "KYC-24004",
    partnerName: "Daniel Ortiz",
    businessName: "City Suds",
    email: "daniel@citysuds.example.com",
    phone: "+1 (555) 201-4404",
    status: "Rejected",
    submittedAt: "2026-03-15",
    documentsSummary: "Gov ID (expired) · Business license",
    services: ["Wash & fold", "Pickup & delivery"],
  },
  {
    id: "KYC-24005",
    partnerName: "Emily Clark",
    businessName: "Blue Tide",
    email: "emily@bluetide.example.com",
    phone: "+1 (555) 201-4405",
    status: "Pending",
    submittedAt: "2026-04-02",
    documentsSummary: "Gov ID · Business license · Insurance",
    services: [
      "Wash & fold",
      "Dry cleaning",
      "Ironing / pressing",
      "Pickup & delivery",
      "Alterations & tailoring",
      "Bedding & household",
    ],
  },
  {
    id: "KYC-24006",
    partnerName: "Robert Kim",
    businessName: "WashWorks Studio",
    email: "robert@washworks.example.com",
    phone: "+1 (555) 201-4406",
    status: "Approved",
    submittedAt: "2026-03-20",
    documentsSummary: "Gov ID · Bank · W-9",
    services: ["Wash & fold", "Dry cleaning", "Pickup & delivery", "Shoe cleaning"],
  },
];

const EXTRA_PARTNER_KYC: AdminPartnerKyc[] = Array.from({ length: 18 }, (_, index) => {
  const n = 24007 + index;
  const statuses: PartnerKycStatus[] = ["Pending", "Approved", "Rejected"];
  const status = statuses[index % 3];
  const month = 1 + (index % 12);
  const day = 1 + (index % 28);
  const serviceCount = 3 + (index % 5);
  const services: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < serviceCount && seen.size < LAUNDRY_SERVICE_POOL.length; i++) {
    const s = LAUNDRY_SERVICE_POOL[(index + i) % LAUNDRY_SERVICE_POOL.length];
    if (!seen.has(s)) {
      seen.add(s);
      services.push(s);
    }
  }
  return {
    id: `KYC-${n}`,
    partnerName: `Partner Contact ${index + 1}`,
    businessName: `Laundry Partner ${String.fromCharCode(65 + (index % 26))} LLC`,
    email: `partner${n}@example.com`,
    phone: `+1 (555) 3${String(10 + (index % 89)).padStart(2, "0")}-${String(2100 + index).slice(-4)}`,
    status,
    submittedAt: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    documentsSummary: index % 2 === 0 ? "Gov ID · Business license" : "Gov ID · Bank (last 4) · Insurance",
    services,
  };
});

const DEMO_PARTNER_KYC: AdminPartnerKyc[] = [...SEEDED_PARTNER_KYC, ...EXTRA_PARTNER_KYC];

export async function fetchPartnerKycDemoData(): Promise<AdminPartnerKyc[]> {
  await new Promise((resolve) => setTimeout(resolve, 95));
  return DEMO_PARTNER_KYC;
}

export async function fetchPartnerKycById(id: string): Promise<AdminPartnerKyc | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return DEMO_PARTNER_KYC.find((partner) => partner.id === id) ?? null;
}

// -----------------------------
// Dashboard demo data
// -----------------------------

const DEMO_DASHBOARD_DATA: DashboardDemoData = {
  title: "Dashboard",
  userCount: 504,
  timeFilter: "Week",
  overviewCards: [
    {
      id: "drop-off",
      title: "Drop Off",
      total: 32,
      services: [
        { label: "Wash and Fold", count: 25 },
        { label: "Dry Cleaning", count: 5 },
        { label: "Tailoring", count: 2 },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      total: 85,
      services: [
        { label: "Wash and Fold", count: 50 },
        { label: "Dry Cleaning", count: 20 },
        { label: "Tailoring", count: 15 },
      ],
    },
  ],
  summaryCards: [
    { id: "total-income", label: "Total Income", value: "$7,240" },
    { id: "drop-off", label: "Drop Off", value: "$2,890" },
    { id: "delivery", label: "Delivery", value: "$3,359" },
  ],
  balance: {
    amount: "$27,240",
    labels: ["M", "T", "W", "T", "F", "S", "S"],
    points: [120, 210, 145, 235, 315, 250, 245],
  },
};

export async function fetchDashboardDemoData(): Promise<DashboardDemoData> {
  // Mimic real API latency so UI behavior stays realistic.
  await new Promise((resolve) => setTimeout(resolve, 120));
  return DEMO_DASHBOARD_DATA;
}

// -----------------------------
// Payments demo data
// -----------------------------

export type PaymentStatus = "Succeeded" | "Pending" | "Failed" | "Refunded";
export type PaymentTiming = "Paid at order" | "Paid at completion";
export type EscrowStatus = "Awaiting payment" | "In escrow" | "Ready for payout" | "Released" | "Refunded" | "Failed";
export type PayoutStatus = "Not ready" | "Ready" | "Sent" | "On hold" | "Failed";
export type PaymentMethodType = "Card" | "Wallet" | "Bank";

export type PaymentKind = "Escrow charge" | "Settlement charge" | "Partner payout" | "Refund" | "Adjustment";

export type AdminPayment = {
  id: string;
  orderId: string;
  customer: string;
  partner: string;
  kind: PaymentKind;
  amount: string;
  grossAmount: string;
  commissionRate: number;
  commissionAmount: string;
  partnerNet: string;
  method: string;
  methodType: PaymentMethodType;
  status: PaymentStatus;
  paymentTiming: PaymentTiming;
  escrowStatus: EscrowStatus;
  payoutStatus: PayoutStatus;
  createdAt: string;
  updatedAt: string;
  orderCompletedAt: string | null;
  payoutProcessedAt: string | null;
  disputeId: string | null;
};

const PAYMENT_STATUSES: PaymentStatus[] = ["Succeeded", "Pending", "Failed", "Refunded"];

const PAYMENT_TIMINGS: PaymentTiming[] = ["Paid at order", "Paid at completion"];
const ESCROW_STATUSES: EscrowStatus[] = ["Awaiting payment", "In escrow", "Ready for payout", "Released", "Refunded", "Failed"];
const PAYOUT_STATUSES: PayoutStatus[] = ["Not ready", "Ready", "Sent", "On hold", "Failed"];
const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ["Card", "Wallet", "Bank"];

const PAYMENT_METHODS = [
  "Visa ·••• 4242",
  "Mastercard ·••• 8891",
  "Apple Pay",
  "Google Pay",
  "ACH ·••• 7721",
  "Bank transfer",
];

function parseCurrency(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addDays(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function buildPaymentRecord(input: {
  id: string;
  orderId: string;
  customer: string;
  partner: string;
  gross: number;
  method: string;
  methodType: PaymentMethodType;
  paymentTiming: PaymentTiming;
  escrowStatus: EscrowStatus;
  payoutStatus: PayoutStatus;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  orderCompletedAt: string | null;
  payoutProcessedAt: string | null;
  disputeId?: string | null;
}): AdminPayment {
  const commissionRate = 0.1;
  const commissionAmount = input.gross > 0 ? Math.round(input.gross * commissionRate * 100) / 100 : 0;
  const partnerNet = input.gross > 0 ? Math.round((input.gross - commissionAmount) * 100) / 100 : 0;
  const kind: PaymentKind =
    input.status === "Refunded"
      ? "Refund"
      : input.paymentTiming === "Paid at completion"
        ? "Settlement charge"
        : "Escrow charge";

  return {
    id: input.id,
    orderId: input.orderId,
    customer: input.customer,
    partner: input.partner,
    kind,
    amount: toCurrency(input.gross),
    grossAmount: toCurrency(input.gross),
    commissionRate,
    commissionAmount: toCurrency(commissionAmount),
    partnerNet: toCurrency(partnerNet),
    method: input.method,
    methodType: input.methodType,
    status: input.status,
    paymentTiming: input.paymentTiming,
    escrowStatus: input.escrowStatus,
    payoutStatus: input.payoutStatus,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    orderCompletedAt: input.orderCompletedAt,
    payoutProcessedAt: input.payoutProcessedAt,
    disputeId: input.disputeId ?? null,
  };
}

const SEEDED_PAYMENTS: AdminPayment[] = [
  {
    ...buildPaymentRecord({
      id: "PAY-88001",
      orderId: "ORD-24001",
      customer: "Olivia Brown",
      partner: "Sparkle Wash Co.",
      gross: 48,
      method: "Visa ·••• 4242",
      methodType: "Card",
      paymentTiming: "Paid at order",
      escrowStatus: "Released",
      payoutStatus: "Sent",
      status: "Succeeded",
      createdAt: "2026-04-01",
      updatedAt: "2026-04-03",
      orderCompletedAt: "2026-04-02",
      payoutProcessedAt: "2026-04-03",
    }),
  },
  {
    ...buildPaymentRecord({
      id: "PAY-88002",
      orderId: "ORD-24002",
      customer: "Ethan Walker",
      partner: "HomeFresh Laundry",
      gross: 62.5,
      method: "Apple Pay",
      methodType: "Wallet",
      paymentTiming: "Paid at order",
      escrowStatus: "In escrow",
      payoutStatus: "Not ready",
      status: "Pending",
      createdAt: "2026-04-02",
      updatedAt: "2026-04-03",
      orderCompletedAt: null,
      payoutProcessedAt: null,
    }),
  },
  {
    ...buildPaymentRecord({
      id: "PAY-88003",
      orderId: "ORD-24003",
      customer: "Sophia Carter",
      partner: "HomeFresh Laundry",
      gross: 28,
      method: "ACH ·••• 7721",
      methodType: "Bank",
      paymentTiming: "Paid at completion",
      escrowStatus: "Released",
      payoutStatus: "Sent",
      status: "Succeeded",
      createdAt: "2026-04-02",
      updatedAt: "2026-04-02",
      orderCompletedAt: "2026-04-02",
      payoutProcessedAt: "2026-04-02",
    }),
  },
  {
    ...buildPaymentRecord({
      id: "PAY-88004",
      orderId: "ORD-23988",
      customer: "Sophia Carter",
      partner: "Sparkle Wash Co.",
      gross: 18,
      method: "Visa ·••• 4242",
      methodType: "Card",
      paymentTiming: "Paid at order",
      escrowStatus: "Refunded",
      payoutStatus: "On hold",
      status: "Refunded",
      createdAt: "2026-03-30",
      updatedAt: "2026-03-31",
      orderCompletedAt: "2026-03-30",
      payoutProcessedAt: null,
      disputeId: "DSP-10003",
    }),
  },
  {
    ...buildPaymentRecord({
      id: "PAY-88005",
      orderId: "ORD-24004",
      customer: "Liam Johnson",
      partner: "QuickPress",
      gross: 35,
      method: "Mastercard ·••• 8891",
      methodType: "Card",
      paymentTiming: "Paid at completion",
      escrowStatus: "Failed",
      payoutStatus: "Failed",
      status: "Failed",
      createdAt: "2026-04-03",
      updatedAt: "2026-04-03",
      orderCompletedAt: "2026-04-03",
      payoutProcessedAt: null,
    }),
  },
  {
    ...buildPaymentRecord({
      id: "PAY-88006",
      orderId: "ORD-24005",
      customer: "Ava Wilson",
      partner: "Sparkle Wash Co.",
      gross: 91.25,
      method: "Bank transfer",
      methodType: "Bank",
      paymentTiming: "Paid at order",
      escrowStatus: "Ready for payout",
      payoutStatus: "Ready",
      status: "Pending",
      createdAt: "2026-04-03",
      updatedAt: "2026-04-04",
      orderCompletedAt: "2026-04-04",
      payoutProcessedAt: null,
    }),
  },
];

const EXTRA_PAYMENTS: AdminPayment[] = Array.from({ length: 38 }, (_, index) => {
  const n = 88007 + index;
  const month = 1 + (index % 12);
  const day = 1 + (index % 28);
  const status = PAYMENT_STATUSES[index % PAYMENT_STATUSES.length];
  const paymentTiming = PAYMENT_TIMINGS[index % PAYMENT_TIMINGS.length];
  const escrowStatus = ESCROW_STATUSES[index % ESCROW_STATUSES.length];
  const payoutStatus = PAYOUT_STATUSES[index % PAYOUT_STATUSES.length];
  const methodType = PAYMENT_METHOD_TYPES[index % PAYMENT_METHOD_TYPES.length];
  const base = 20 + (index % 170);
  const cents = (index * 13) % 100;
  const gross = parseCurrency(`$${base}.${String(cents).padStart(2, "0")}`);
  const createdAt = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const completedAt = escrowStatus === "In escrow" || escrowStatus === "Awaiting payment" ? null : addDays(createdAt, 1);
  const payoutProcessedAt = payoutStatus === "Sent" ? addDays(createdAt, 2) : null;

  return buildPaymentRecord({
    id: `PAY-${n}`,
    orderId: `ORD-${24010 + (index % 40)}`,
    customer: randomFrom(CUSTOMERS, index + 2),
    partner: randomFrom(PARTNERS, index + 1),
    gross,
    method: randomFrom(PAYMENT_METHODS, index + 5),
    methodType,
    paymentTiming,
    escrowStatus,
    payoutStatus,
    status,
    createdAt,
    updatedAt: addDays(createdAt, 1),
    orderCompletedAt: completedAt,
    payoutProcessedAt,
    disputeId: status === "Refunded" ? `DSP-${10020 + (index % 12)}` : null,
  });
});

const DEMO_PAYMENTS: AdminPayment[] = [...SEEDED_PAYMENTS, ...EXTRA_PAYMENTS];

export async function fetchPaymentsDemoData(): Promise<AdminPayment[]> {
  await new Promise((resolve) => setTimeout(resolve, 85));
  return DEMO_PAYMENTS;
}

// -----------------------------
// Disputes demo data
// -----------------------------

export type DisputeStatus = "Open" | "Under review" | "Resolved" | "Closed";

export type DisputeCategory =
  | "Damaged items"
  | "Missed pickup"
  | "Billing"
  | "Delivery delay"
  | "Wrong items"
  | "Other";

export type AdminDispute = {
  id: string;
  orderId: string;
  customer: string;
  partner: string;
  category: DisputeCategory;
  summary: string;
  status: DisputeStatus;
  openedAt: string;
  updatedAt: string;
};

const DISPUTE_STATUSES: DisputeStatus[] = ["Open", "Under review", "Resolved", "Closed"];

const DISPUTE_CATEGORIES: DisputeCategory[] = [
  "Damaged items",
  "Missed pickup",
  "Billing",
  "Delivery delay",
  "Wrong items",
  "Other",
];

const DISPUTE_SUMMARIES = [
  "Silk blouse returned with discoloration",
  "Driver never arrived for scheduled pickup",
  "Charged twice for same order",
  "Delivery arrived one day late",
  "Received someone else's garments",
  "Refund requested but not received",
  "Pressing damage on dress shirt",
  "No-show pickup window — no call",
  "Incorrect weight on invoice",
  "Express order missed deadline",
];

const SEEDED_DISPUTES: AdminDispute[] = [
  {
    id: "DSP-10001",
    orderId: "ORD-24001",
    customer: "Olivia Brown",
    partner: "Sparkle Wash Co.",
    category: "Damaged items",
    summary: "Silk blouse returned with discoloration",
    status: "Under review",
    openedAt: "2026-04-01",
    updatedAt: "2026-04-02",
  },
  {
    id: "DSP-10002",
    orderId: "ORD-23995",
    customer: "Ethan Walker",
    partner: "HomeFresh Laundry",
    category: "Missed pickup",
    summary: "Driver never arrived for scheduled pickup",
    status: "Open",
    openedAt: "2026-04-02",
    updatedAt: "2026-04-02",
  },
  {
    id: "DSP-10003",
    orderId: "ORD-24008",
    customer: "Sophia Carter",
    partner: "Sparkle Wash Co.",
    category: "Billing",
    summary: "Charged twice for same order",
    status: "Open",
    openedAt: "2026-04-02",
    updatedAt: "2026-04-02",
  },
  {
    id: "DSP-10004",
    orderId: "ORD-23970",
    customer: "Liam Johnson",
    partner: "QuickPress",
    category: "Delivery delay",
    summary: "Express order missed deadline",
    status: "Resolved",
    openedAt: "2026-03-28",
    updatedAt: "2026-03-31",
  },
  {
    id: "DSP-10005",
    orderId: "ORD-24012",
    customer: "Ava Wilson",
    partner: "City Suds",
    category: "Wrong items",
    summary: "Received someone else's garments",
    status: "Closed",
    openedAt: "2026-03-20",
    updatedAt: "2026-03-25",
  },
  {
    id: "DSP-10006",
    orderId: "ORD-24003",
    customer: "Mia Garcia",
    partner: "Blue Tide",
    category: "Other",
    summary: "Refund requested but not received",
    status: "Under review",
    openedAt: "2026-04-03",
    updatedAt: "2026-04-03",
  },
];

const EXTRA_DISPUTES: AdminDispute[] = Array.from({ length: 34 }, (_, index) => {
  const n = 10007 + index;
  const month = 1 + (index % 12);
  const day = 1 + (index % 28);
  const status = DISPUTE_STATUSES[index % DISPUTE_STATUSES.length];
  const category = DISPUTE_CATEGORIES[index % DISPUTE_CATEGORIES.length];
  const summary = randomFrom(DISPUTE_SUMMARIES, index + 3);

  return {
    id: `DSP-${n}`,
    orderId: `ORD-${23950 + (index % 55)}`,
    customer: randomFrom(CUSTOMERS, index + 1),
    partner: randomFrom(PARTNERS, index + 7),
    category,
    summary,
    status,
    openedAt: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    updatedAt: `2026-${String(Math.min(12, month + (index % 2))).padStart(2, "0")}-${String(Math.min(28, day + (index % 3))).padStart(2, "0")}`,
  };
});

const DEMO_DISPUTES: AdminDispute[] = [...SEEDED_DISPUTES, ...EXTRA_DISPUTES];

export async function fetchDisputesDemoData(): Promise<AdminDispute[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return DEMO_DISPUTES;
}

