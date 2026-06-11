import { parseAdminListQuery } from "@/features/admin/server/admin-list-query";
import { listPartnerCreditTransactionsForAdminPaginated } from "@/features/admin/server/credits/partner-credits.repository";
import { NextResponse } from "next/server";

type Params = { partnerId: string };

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { partnerId } = await params;
    const result = await listPartnerCreditTransactionsForAdminPaginated(
      decodeURIComponent(partnerId),
      parseAdminListQuery(new URL(request.url).searchParams),
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load partner transactions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
