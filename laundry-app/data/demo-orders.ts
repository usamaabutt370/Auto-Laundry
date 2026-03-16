import type { OrderCardRightIcon } from "@/components/order-card";

/** Status used for filter: Orders (new), Assigned, Completed. */
export type DemoOrderStatus = "orders" | "assigned" | "completed";

/** Month key for filtering – matches demo-orders.json monthKey. */
export type MonthKey =
  | "january"
  | "february"
  | "march"
  | "april"
  | "may"
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december";

export interface DemoOrder {
  id: string;
  customerName: string;
  initial: string;
  date: string;
  time: string;
  type: "pickup" | "delivery";
  /**
   * Optional. "scooter" | "bag" show the two right-side icons; omit or "none" = no icon.
   * Must match demo data so icons are not hardcoded in the UI.
   */
  rightIcon?: OrderCardRightIcon;
  status: DemoOrderStatus;
  monthKey: MonthKey;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const demoOrdersJson = require("./demo-orders.json");

export const DEMO_ORDERS: DemoOrder[] = demoOrdersJson as DemoOrder[];
