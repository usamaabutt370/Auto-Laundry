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
