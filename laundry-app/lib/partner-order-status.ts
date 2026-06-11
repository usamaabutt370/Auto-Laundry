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

export interface PartnerOrderRejectionPayload {
  option: string;
  details?: string;
}

/**
 * Updates order status via partner_update_order_status RPC.
 * Rider assignment is handled separately in order-rider-assignment.ts so we
 * never pass p_assigned_rider_id here (avoids overload ambiguity on the DB).
 */
export async function partnerUpdateOrderStatus(
  orderId: string,
  status: PartnerOrderStatusTarget,
  rejection?: PartnerOrderRejectionPayload,
  _assignedRiderId?: string | null,
): Promise<PartnerOrderStatusUpdateResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("partner_update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
    p_charge_rate_pct: PARTNER_ORDER_DEDUCTION_RATE_PERCENT,
    p_rejection_reason_option: status === "rejected" ? rejection?.option ?? null : null,
    p_rejection_reason_details: status === "rejected" ? rejection?.details ?? null : null,
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
