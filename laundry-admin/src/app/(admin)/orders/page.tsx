import { OrdersList } from "@/features/admin/components/orders-list";
import { parsePageSearchParams } from "@/features/admin/server/admin-list-query";
import { listCustomerOrdersForAdminPaginated } from "@/features/admin/server/orders/customer-orders.repository";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await listCustomerOrdersForAdminPaginated(parsePageSearchParams(await searchParams));
  return <OrdersList data={data} />;
}
