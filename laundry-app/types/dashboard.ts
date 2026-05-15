/**
 * Launderer dashboard data shape. Totals and chart are scoped to the selected calendar
 * period (current week Mon–Sun, current month, or current year) from useLaundererDashboard.
 */
export interface PartnerEarningItem {
  orderId: string;
  earnedAmount: number;
  earnedAtIso: string;
}

export interface LaundererDashboardData {
  /** Distinct customers (profiles) among completed orders in the selected period. */
  numberOfUsers: number;
  dropOff: {
    /** Active drop-off orders (not completed / rejected / cancelled). */
    total: number;
  };
  delivery: {
    /** Active delivery / pickup-scheduled orders. */
    total: number;
  };
  /** Count of completed orders whose earnings fall in the selected period. */
  completedOrdersInPeriod: number;
  /** Completed-order revenue in the selected period (all channels). */
  totalIncome: number;
  /** Completed drop-off revenue in the selected period. */
  dropOffIncome: number;
  /** Completed delivery revenue in the selected period. */
  deliveryIncome: number;
  /** Seven buckets within the selected calendar period (earnings). */
  earningsChartValues: [number, number, number, number, number, number, number];
  /** Labels for each chart bucket (days of week, or dates). */
  chartLabels: [string, string, string, string, string, string, string];
  /** Recent completed-order earnings in the selected period (latest first). */
  recentCompletedEarnings: PartnerEarningItem[];
}

/** Zero state when there is no activity. */
export const ZERO_DASHBOARD_DATA: LaundererDashboardData = {
  numberOfUsers: 0,
  completedOrdersInPeriod: 0,
  dropOff: { total: 0 },
  delivery: { total: 0 },
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
  completedOrdersInPeriod: 42,
  dropOff: { total: 32 },
  delivery: { total: 85 },
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
