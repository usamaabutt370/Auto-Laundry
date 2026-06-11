import { DisputesList } from "@/features/admin/components/disputes-list";
import { parsePageSearchParams } from "@/features/admin/server/admin-list-query";
import { listOrderDisputesForAdminPaginated } from "@/features/admin/server/disputes/order-disputes.repository";

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await listOrderDisputesForAdminPaginated(parsePageSearchParams(await searchParams));
  return <DisputesList data={data} />;
}
