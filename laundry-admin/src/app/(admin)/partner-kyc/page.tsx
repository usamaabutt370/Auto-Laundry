import { PartnerKycList } from "@/features/admin/components/partner-kyc-list";
import { parsePageSearchParams } from "@/features/admin/server/admin-list-query";
import { listPartnerKycRequestsForAdminPaginated } from "@/features/admin/server/kyc/partner-kyc.repository";

export default async function PartnerKycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await listPartnerKycRequestsForAdminPaginated(parsePageSearchParams(await searchParams));
  return <PartnerKycList data={data} />;
}
