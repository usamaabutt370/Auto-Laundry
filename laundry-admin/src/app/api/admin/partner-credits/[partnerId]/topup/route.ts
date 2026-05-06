import { addCreditsToPartnerAccount } from "@/features/admin/server/credits/partner-credits.repository";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { partnerId } = await params;
    const payload = (await request.json().catch(() => null)) as { amount?: number; note?: string } | null;
    const amount = Number(payload?.amount);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "amount must be a positive integer." }, { status: 400 });
    }

    const result = await addCreditsToPartnerAccount({
      partnerId: decodeURIComponent(partnerId),
      amount,
      note: payload?.note ?? null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while adding credits.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
