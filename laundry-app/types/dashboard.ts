/**
 * Launderer dashboard data shape.
 * When you have DB data: map your rows to this type (e.g. one object with these fields)
 * and return it from useLaundererDashboard() – the UI will use it directly. No extra wiring.
 */
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
  chartValues: [0, 0, 0, 0, 0, 0, 0],
};
