import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import type { OrderEstimateResult } from "@/lib/customer-order-estimate";
import {
  buildCustomerOrderHeaderUpdate,
  buildOrderServiceItemRows,
  buildOrderServiceRows,
} from "@/lib/customer-order-payload";
import type { PartnerDetailRow, PartnerServiceLine } from "@/lib/partner-discovery";
import { supabase } from "@/lib/supabase";

type SubmitParams = {
  customerId: string;
  draft: CustomerOrderDraft;
  estimate: OrderEstimateResult;
  profile: PartnerDetailRow | null;
  services: PartnerServiceLine[];
};

export async function submitCustomerOrder({
  customerId,
  draft,
  estimate,
  profile,
  services,
}: SubmitParams): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!draft.partnerId) {
    return { ok: false, error: "No launderer selected." };
  }
  if (draft.selectedServiceIds.length === 0) {
    return { ok: false, error: "No services selected." };
  }

  const header = buildCustomerOrderHeaderUpdate(draft, estimate);

  const { data: orderRow, error: orderErr } = await supabase
    .from("customer_orders")
    .insert({
      customer_id: customerId,
      partner_id: draft.partnerId,
      status: "submitted",
      ...header,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (orderErr || !orderRow?.id) {
    return { ok: false, error: orderErr?.message ?? "Failed to create order." };
  }

  const orderId = orderRow.id;
  const cleanup = async () => {
    await supabase.from("customer_orders").delete().eq("id", orderId);
  };

  const servicePayload = buildOrderServiceRows(orderId, draft, estimate);

  const { data: serviceRows, error: serviceErr } = await supabase
    .from("order_services")
    .insert(servicePayload)
    .select("id, service_type");

  if (serviceErr || !serviceRows) {
    await cleanup();
    return { ok: false, error: serviceErr?.message ?? "Failed to save service rows." };
  }

  const byType = new Map<string, string>();
  for (const row of serviceRows as { id: string; service_type: string }[]) {
    byType.set(row.service_type, row.id);
  }

  const itemPayload = buildOrderServiceItemRows(byType, draft, services);

  if (itemPayload.length > 0) {
    const { error: itemErr } = await supabase.from("order_service_items").insert(itemPayload);
    if (itemErr) {
      await cleanup();
      return { ok: false, error: itemErr.message };
    }
  }

  return { ok: true, orderId };
}
