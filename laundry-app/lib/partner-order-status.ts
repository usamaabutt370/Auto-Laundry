import { supabase } from "@/lib/supabase";
import { PARTNER_ORDER_DEDUCTION_RATE_PERCENT } from "@/lib/partner-credits";

export type PartnerOrderStatusTarget =
  | "accepted"
  | "rejected"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";

export interface PartnerOrderStatusUpdateResult {
  status: PartnerOrderStatusTarget;
  charged: number;
  balance: number;
}

export async function partnerUpdateOrderStatus(
  orderId: string,
  status: PartnerOrderStatusTarget,
): Promise<PartnerOrderStatusUpdateResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("partner_update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
    p_charge_rate_pct: PARTNER_ORDER_DEDUCTION_RATE_PERCENT,
  });
  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  return {
    status: (row?.status as PartnerOrderStatusTarget) ?? status,
    charged: Number(row?.charged ?? 0),
    balance: Number(row?.balance ?? 0),
  };
}
