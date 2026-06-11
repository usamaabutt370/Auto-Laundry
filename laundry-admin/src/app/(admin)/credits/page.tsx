import { PartnerCreditsList } from "@/features/admin/components/partner-credits-list";
import { parsePageSearchParams } from "@/features/admin/server/admin-list-query";
import { listPartnerCreditBalancesForAdminPaginated } from "@/features/admin/server/credits/partner-credits.repository";

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await listPartnerCreditBalancesForAdminPaginated(parsePageSearchParams(await searchParams));
  return <PartnerCreditsList data={data} />;
}
