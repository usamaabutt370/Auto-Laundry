/**
 * Launderer dashboard data shape.
 * When you have DB data: map your rows to this type (e.g. one object with these fields)
 * and return it from useLaundererDashboard() – the UI will use it directly. No extra wiring.
 */
export interface PartnerEarningItem {
  orderId: string;
  earnedAmount: number;
  earnedAtIso: string;
}

export interface LaundererDashboardData {
  numberOfUsers: number;
  dropOff: {
    total: number;
    washAndFold: number;
    dryCleaning: number;
    tailoring: number;
  };
  delivery: {
    total: number;
    washAndFold: number;
    dryCleaning: number;
    tailoring: number;
  };
  totalIncome: number;
  dropOffIncome: number;
  deliveryIncome: number;
  /** 7 values for selected period buckets (earnings). */
  earningsChartValues: [number, number, number, number, number, number, number];
  /** 7 labels matching selected period buckets. */
  chartLabels: [string, string, string, string, string, string, string];
  /** Recent completed-order earnings (latest first). */
  recentCompletedEarnings: PartnerEarningItem[];
}

/** Zero state when there is no activity. */
export const ZERO_DASHBOARD_DATA: LaundererDashboardData = {
  numberOfUsers: 0,
  dropOff: { total: 0, washAndFold: 0, dryCleaning: 0, tailoring: 0 },
  delivery: { total: 0, washAndFold: 0, dryCleaning: 0, tailoring: 0 },
  totalIncome: 0,
  dropOffIncome: 0,
  deliveryIncome: 0,
  earningsChartValues: [0, 0, 0, 0, 0, 0, 0],
  chartLabels: ["M", "T", "W", "T", "F", "S", "S"],
  recentCompletedEarnings: [],
};

/** Demo data for dashboard UI/chart preview until backend is wired. */
export const DEMO_DASHBOARD_DATA: LaundererDashboardData = {
  numberOfUsers: 504,
  dropOff: { total: 32, washAndFold: 25, dryCleaning: 5, tailoring: 2 },
  delivery: { total: 85, washAndFold: 50, dryCleaning: 20, tailoring: 15 },
  totalIncome: 7240,
  dropOffIncome: 2890,
  deliveryIncome: 3359,
  earningsChartValues: [180, 320, 260, 410, 355, 520, 460],
  chartLabels: ["M", "T", "W", "T", "F", "S", "S"],
  recentCompletedEarnings: [
    {
      orderId: "demo-order-1",
      earnedAmount: 120,
      earnedAtIso: new Date().toISOString(),
    },
    {
      orderId: "demo-order-2",
      earnedAmount: 100,
      earnedAtIso: new Date().toISOString(),
    },
  ],
};
