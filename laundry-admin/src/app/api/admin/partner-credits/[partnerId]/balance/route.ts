import { setPartnerCreditBalance } from "@/features/admin/server/credits/partner-credits.repository";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { partnerId } = await params;
    const payload = (await request.json().catch(() => null)) as { newBalance?: number; note?: string } | null;
    const newBalance = Number(payload?.newBalance);

    if (!Number.isFinite(newBalance) || newBalance < 0 || !Number.isInteger(newBalance)) {
      return NextResponse.json({ error: "newBalance must be a non-negative integer." }, { status: 400 });
    }

    const result = await setPartnerCreditBalance({
      partnerId: decodeURIComponent(partnerId),
      newBalance,
      note: payload?.note ?? null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while editing balance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
