import { supabase } from "@/lib/supabase";

export type IntakeLineInput = {
  id: string;
  confirmedQuantity: number;
};

export async function confirmPartnerOrderBill(
  orderId: string,
  lines: IntakeLineInput[],
  intakeNotes?: string,
): Promise<
  | { ok: true; confirmedTotal: number; confirmedAt: string }
  | { ok: false; error: string }
> {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (lines.length === 0) {
    return { ok: false, error: "Add at least one item line to confirm." };
  }

  const payload = lines.map((line) => ({
    id: line.id,
    confirmed_quantity: Math.max(0, line.confirmedQuantity),
  }));

  const { data, error } = await supabase.rpc("partner_confirm_order_bill", {
    p_order_id: orderId,
    p_items: payload,
    p_intake_notes: intakeNotes?.trim() ?? "",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const confirmedTotal = Number(
    (row as { confirmed_total?: number } | null)?.confirmed_total ?? 0,
  );
  const confirmedAt = String(
    (row as { confirmed_at?: string } | null)?.confirmed_at ?? new Date().toISOString(),
  );

  return { ok: true, confirmedTotal, confirmedAt };
}
