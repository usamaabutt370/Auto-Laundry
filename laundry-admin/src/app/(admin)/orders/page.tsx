import { OrdersList } from "@/features/admin/components/orders-list";
import { fetchOrdersDemoData } from "@/features/admin/data/orders-demo-data";

export default async function OrdersPage() {
  const orders = await fetchOrdersDemoData();

  return <OrdersList orders={orders} />;
}
