import {
  deleteCustomerProfileForAdmin,
  updateCustomerProfileForAdmin,
} from "@/features/admin/server/users/customer-profiles.repository";
import { NextResponse } from "next/server";

type Params = { userId: string };

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { userId } = await params;
    const payload = (await request.json().catch(() => null)) as
      | { name?: string; email?: string; phone?: string }
      | null;

    await updateCustomerProfileForAdmin({
      userId: decodeURIComponent(userId),
      name: payload?.name ?? "",
      email: payload?.email ?? "",
      phone: payload?.phone ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { userId } = await params;
    await deleteCustomerProfileForAdmin(decodeURIComponent(userId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
