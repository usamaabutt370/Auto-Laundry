export interface DemoOrderBag {
  id: string;
  label: string;
  service: string;
  weight: string;
  numItems: string;
  preferences: string;
  estimatedPrice: string;
}

export interface DemoOrderDetail {
  orderId: string;
  orderNumber: string;
  status: string;
  clientName: string;
  clientInitial: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  pickup: string;
  delivery: string;
  courier: string;
  bags: DemoOrderBag[];
  specialInstructionsPlaceholder: string;
  confirmButtonLabel: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const detailsJson = require("./demo-order-details.json") as Record<
  string,
  DemoOrderDetail
>;

export function getOrderDetail(orderId: string): DemoOrderDetail | null {
  return detailsJson[orderId] ?? null;
}
