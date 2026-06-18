import {
  getAdminPartnerKycDetail,
  getAdminPartnerUserIdByRequestId,
} from "@/features/admin/data/admin-partner-kyc";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { partnerId } = await params;
    const decodedId = decodeURIComponent(partnerId);

    const fromUserId = await getAdminPartnerKycDetail(decodedId);
    if (fromUserId) return NextResponse.json({ ok: true, partner: fromUserId });

    const resolvedUserId = await getAdminPartnerUserIdByRequestId(decodedId);
    if (!resolvedUserId) {
      return NextResponse.json({ error: "Partner KYC detail not found." }, { status: 404 });
    }

    const fromRequestId = await getAdminPartnerKycDetail(resolvedUserId);
    if (!fromRequestId) {
      return NextResponse.json({ error: "Partner KYC detail not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, partner: fromRequestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load partner KYC detail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
