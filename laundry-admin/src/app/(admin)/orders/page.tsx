import { OrdersList } from "@/features/admin/components/orders-list";
import { getAdminOrders } from "@/features/admin/data/admin-orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getAdminOrders();

  return <OrdersList orders={orders} />;
}
