import type { CustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import type { OrderEstimateResult } from "@/lib/customer-order-estimate";
import {
  buildCustomerOrderHeaderUpdate,
  buildOrderServiceItemRows,
  buildOrderServiceRows,
} from "@/lib/customer-order-payload";
import type { PartnerDetailRow, PartnerServiceLine } from "@/lib/partner-discovery";
import { env } from "@/constants/env";
import { supabase } from "@/lib/supabase";

type SubmitParams = {
  customerId: string;
  draft: CustomerOrderDraft;
  estimate: OrderEstimateResult;
  profile: PartnerDetailRow | null;
  services: PartnerServiceLine[];
};

function formatSupabaseError(err: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
} | null): string {
  if (!err) return "Unknown database error.";
  const parts = [err.message, err.details, err.hint, err.code ? `code=${err.code}` : null].filter(
    Boolean,
  );
  return parts.join(" | ") || "Unknown database error.";
}

export async function submitCustomerOrder({
  customerId,
  draft,
  estimate,
  profile,
  services,
}: SubmitParams): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  if (!supabase) {
    return {
      ok: false,
      error: `Supabase is not configured. url=${Boolean(env.supabaseUrl)} key=${Boolean(env.supabaseAnonKey)}`,
    };
  }
  if (!draft.partnerId) {
    return { ok: false, error: "No launderer selected." };
  }
  if (draft.selectedServiceIds.length === 0) {
    return { ok: false, error: "No services selected." };
  }

  const header = buildCustomerOrderHeaderUpdate(draft, estimate);
  console.log("[submitCustomerOrder] start", {
    customerId,
    partnerId: draft.partnerId,
    serviceTypes: draft.selectedServiceIds.join(","),
    supabaseHost: env.supabaseUrl,
  });

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
    console.warn("[submitCustomerOrder] order insert failed", orderErr);
    return {
      ok: false,
      error: formatSupabaseError(orderErr) || "Failed to create order.",
    };
  }

  const orderId = orderRow.id;
  const cleanup = async () => {
    await supabase.from("customer_orders").delete().eq("id", orderId);
  };

  const servicePayload = buildOrderServiceRows(orderId, draft, estimate);
  console.log(
    "[submitCustomerOrder] services",
    servicePayload.map((row) => row.service_type),
  );

  const { data: serviceRows, error: serviceErr } = await supabase
    .from("order_services")
    .insert(servicePayload)
    .select("id, service_type");

  if (serviceErr || !serviceRows?.length) {
    await cleanup();
    console.warn("[submitCustomerOrder] service insert failed", serviceErr, serviceRows);
    return {
      ok: false,
      error:
        formatSupabaseError(serviceErr) ||
        (!serviceRows?.length
          ? "Failed to save service rows (empty response — check RLS)."
          : "Failed to save service rows."),
    };
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
      console.warn("[submitCustomerOrder] item insert failed", itemErr);
      return { ok: false, error: formatSupabaseError(itemErr) };
    }
  }

  console.log("[submitCustomerOrder] ok", orderId);
  return { ok: true, orderId };
}
