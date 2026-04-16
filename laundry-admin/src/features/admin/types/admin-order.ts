export type OrderStatus =
  | "Placed"
  | "Accepted"
  | "In Progress"
  | "Ready"
  | "Delivered"
  | "Cancelled"
  | "N/A";

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
