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
};

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
  },
];

const EXTRA_PARTNER_KYC: AdminPartnerKyc[] = Array.from({ length: 18 }, (_, index) => {
  const n = 24007 + index;
  const statuses: PartnerKycStatus[] = ["Pending", "Approved", "Rejected"];
  const status = statuses[index % 3];
  const month = 1 + (index % 12);
  const day = 1 + (index % 28);
  return {
    id: `KYC-${n}`,
    partnerName: `Partner Contact ${index + 1}`,
    businessName: `Laundry Partner ${String.fromCharCode(65 + (index % 26))} LLC`,
    email: `partner${n}@example.com`,
    phone: `+1 (555) 3${String(10 + (index % 89)).padStart(2, "0")}-${String(2100 + index).slice(-4)}`,
    status,
    submittedAt: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    documentsSummary: index % 2 === 0 ? "Gov ID · Business license" : "Gov ID · Bank (last 4) · Insurance",
  };
});

const DEMO_PARTNER_KYC: AdminPartnerKyc[] = [...SEEDED_PARTNER_KYC, ...EXTRA_PARTNER_KYC];

export async function fetchPartnerKycDemoData(): Promise<AdminPartnerKyc[]> {
  await new Promise((resolve) => setTimeout(resolve, 95));
  return DEMO_PARTNER_KYC;
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

