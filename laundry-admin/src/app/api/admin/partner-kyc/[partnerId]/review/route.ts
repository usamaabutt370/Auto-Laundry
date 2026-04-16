import { approvePartnerKycRequest, rejectPartnerKycRequest } from "@/features/admin/server/kyc/partner-kyc.repository";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { partnerId } = await params;
    const userId = decodeURIComponent(partnerId);
    const payload = (await request.json().catch(() => null)) as
      | { action?: string; rejectionReason?: string }
      | null;
    const action = payload?.action;
    const rejectionReason = payload?.rejectionReason?.trim() || "";
    const reviewedBy = process.env.ADMIN_USER_ID?.trim() || null;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "approve") {
      await approvePartnerKycRequest({ userId, reviewedBy });
      return NextResponse.json({ ok: true, status: "approved" });
    }

    if (!rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    await rejectPartnerKycRequest({ userId, reason: rejectionReason, reviewedBy });
    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while reviewing KYC.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { approvePartnerKycRequest, rejectPartnerKycRequest } from "@/features/admin/server/kyc/partner-kyc.repository";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  try {
    const { partnerId } = await params;
    const userId = decodeURIComponent(partnerId);
    const payload = (await request.json().catch(() => null)) as
      | { action?: string; rejectionReason?: string }
      | null;

    const action = payload?.action;
    const rejectionReason = payload?.rejectionReason?.trim() || "";
    const reviewedBy = process.env.ADMIN_USER_ID?.trim() || null;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "approve") {
      await approvePartnerKycRequest({ userId, reviewedBy });
      return NextResponse.json({ ok: true, status: "approved" });
    }

    if (!rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    await rejectPartnerKycRequest({ userId, reason: rejectionReason, reviewedBy });
    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while reviewing KYC.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
