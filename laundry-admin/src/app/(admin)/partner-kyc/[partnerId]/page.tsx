import { PartnerKycDetail } from "@/features/admin/components/partner-kyc-detail";
import { fetchPartnerKycById } from "@/features/admin/data/partner-kyc-demo-data";
import { notFound } from "next/navigation";

type PartnerKycDetailPageProps = {
  params: Promise<{ partnerId: string }>;
};

export default async function PartnerKycDetailPage({ params }: PartnerKycDetailPageProps) {
  const { partnerId } = await params;
  const decodedId = decodeURIComponent(partnerId);
  const partner = await fetchPartnerKycById(decodedId);

  if (!partner) {
    notFound();
  }

  return <PartnerKycDetail partner={partner} />;
}
