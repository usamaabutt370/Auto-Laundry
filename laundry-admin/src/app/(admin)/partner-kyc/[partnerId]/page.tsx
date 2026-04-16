import { PartnerKycDetail } from "@/features/admin/components/partner-kyc-detail";
import { getAdminPartnerKycDetail } from "@/features/admin/data/admin-partner-kyc";
import { notFound } from "next/navigation";

type PartnerKycDetailPageProps = {
  params: Promise<{ partnerId: string }>;
};

export default async function PartnerKycDetailPage({ params }: PartnerKycDetailPageProps) {
  const { partnerId } = await params;
  const decodedId = decodeURIComponent(partnerId);
  const partner = await getAdminPartnerKycDetail(decodedId);

  if (!partner) {
    notFound();
  }

  return <PartnerKycDetail partner={partner} />;
}
