import { PartnerKycList } from "@/features/admin/components/partner-kyc-list";
import { getAdminPartnerKycList } from "@/features/admin/data/admin-partner-kyc";

export const dynamic = "force-dynamic";

export default async function PartnerKycPage() {
  const partners = await getAdminPartnerKycList();

  return <PartnerKycList partners={partners} />;
}
