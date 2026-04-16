import type { AdminOrder } from "@/features/admin/types/admin-order";
import { listCustomerOrdersForAdmin } from "@/features/admin/server/orders/customer-orders.repository";

export type { AdminOrder } from "@/features/admin/types/admin-order";
export type { OrderStatus, ShippingService } from "@/features/admin/types/admin-order";

export async function getAdminOrders(): Promise<AdminOrder[]> {
  return listCustomerOrdersForAdmin();
}
