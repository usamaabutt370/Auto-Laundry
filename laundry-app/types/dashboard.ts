/**
 * Launderer dashboard data shape.
 * When you have DB data: map your rows to this type (e.g. one object with these fields)
 * and return it from useLaundererDashboard() – the UI will use it directly. No extra wiring.
 */
export interface PartnerTokenDeductionItem {
  orderId: string;
  deductedTokens: number;
  orderAmount: number;
  chargedAtIso: string;
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
  balance: number;
  /** Most recent token deduction value for one accepted order. */
  latestOrderDeduction: number;
  /** Sum of token deductions tied to completed orders. */
  completedOrderDeductionsTotal: number;
  /** Recent completed-order deductions (latest first). */
  recentCompletedOrderDeductions: PartnerTokenDeductionItem[];
  /** 7 values for Mon–Sun (M T W T F S S) */
  chartValues: [number, number, number, number, number, number, number];
}

/** Zero state when there is no activity. */
export const ZERO_DASHBOARD_DATA: LaundererDashboardData = {
  numberOfUsers: 0,
  dropOff: { total: 0, washAndFold: 0, dryCleaning: 0, tailoring: 0 },
  delivery: { total: 0, washAndFold: 0, dryCleaning: 0, tailoring: 0 },
  totalIncome: 0,
  dropOffIncome: 0,
  deliveryIncome: 0,
  balance: 0,
  latestOrderDeduction: 0,
  completedOrderDeductionsTotal: 0,
  recentCompletedOrderDeductions: [],
  chartValues: [0, 0, 0, 0, 0, 0, 0],
};

/** Demo data for dashboard UI/chart preview until backend is wired. */
export const DEMO_DASHBOARD_DATA: LaundererDashboardData = {
  numberOfUsers: 504,
  dropOff: { total: 32, washAndFold: 25, dryCleaning: 5, tailoring: 2 },
  delivery: { total: 85, washAndFold: 50, dryCleaning: 20, tailoring: 15 },
  totalIncome: 7240,
  dropOffIncome: 2890,
  deliveryIncome: 3359,
  balance: 27240,
  latestOrderDeduction: 120,
  completedOrderDeductionsTotal: 340,
  recentCompletedOrderDeductions: [
    {
      orderId: "demo-order-1",
      deductedTokens: 120,
      orderAmount: 1200,
      chargedAtIso: new Date().toISOString(),
    },
    {
      orderId: "demo-order-2",
      deductedTokens: 100,
      orderAmount: 1000,
      chargedAtIso: new Date().toISOString(),
    },
    {
      orderId: "demo-order-3",
      deductedTokens: 120,
      orderAmount: 1200,
      chargedAtIso: new Date().toISOString(),
    },
  ],
  /** Mon–Sun sample trend for chart. */
  chartValues: [3200, 4800, 4100, 6200, 5500, 7200, 6400],
};
