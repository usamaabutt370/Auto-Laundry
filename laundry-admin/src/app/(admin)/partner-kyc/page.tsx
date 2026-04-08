import { PartnerKycList } from "@/features/admin/components/partner-kyc-list";
import { fetchPartnerKycDemoData } from "@/features/admin/data/partner-kyc-demo-data";

export default async function PartnerKycPage() {
  const partners = await fetchPartnerKycDemoData();

  return <PartnerKycList partners={partners} />;
}
