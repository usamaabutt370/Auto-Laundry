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
};

export async function fetchDashboardDemoData(): Promise<DashboardDemoData> {
  // Mimic real API latency so UI behavior stays realistic.
  await new Promise((resolve) => setTimeout(resolve, 120));
  return DEMO_DASHBOARD_DATA;
}
