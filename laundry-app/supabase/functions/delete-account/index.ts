/// <reference path="../deno-globals.d.ts" />
// Deno resolves npm: imports at deploy; Node/IDE TypeScript does not.
// @ts-expect-error Supabase Edge Runtime import
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DeleteAccountResponse = {
  success: boolean;
  message?: string;
  code?: string;
};

function jsonResponse(body: DeleteAccountResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse(
      { success: false, message: "Server configuration error", code: "CONFIG" },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, message: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ success: false, message: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = user.id;

  // Remove draft orders so new users without history can delete cleanly.
  await admin.from("customer_orders").delete().eq("customer_id", userId).eq("status", "draft");

  const { count: customerOrderCount, error: customerOrdersError } = await admin
    .from("customer_orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", userId);

  if (customerOrdersError) {
    return jsonResponse(
      { success: false, message: customerOrdersError.message, code: "CHECK_FAILED" },
      500,
    );
  }

  const { count: partnerOrderCount, error: partnerOrdersError } = await admin
    .from("customer_orders")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", userId);

  if (partnerOrdersError) {
    return jsonResponse(
      { success: false, message: partnerOrdersError.message, code: "CHECK_FAILED" },
      500,
    );
  }

  if ((customerOrderCount ?? 0) > 0 || (partnerOrderCount ?? 0) > 0) {
    return jsonResponse(
      {
        success: false,
        code: "HAS_ORDER_HISTORY",
        message:
          "Your account has order history and cannot be deleted automatically. Please contact support to request account deletion.",
      },
      409,
    );
  }

  const { count: chatCount, error: chatError } = await admin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId);

  if (chatError) {
    return jsonResponse(
      { success: false, message: chatError.message, code: "CHECK_FAILED" },
      500,
    );
  }

  if ((chatCount ?? 0) > 0) {
    return jsonResponse(
      {
        success: false,
        code: "HAS_CHAT_HISTORY",
        message:
          "Your account has chat history and cannot be deleted automatically. Please contact support.",
      },
      409,
    );
  }

  // Best-effort avatar cleanup (ignore errors).
  try {
    const { data: files } = await admin.storage.from("avatars").list(userId);
    if (files?.length) {
      const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
      await admin.storage.from("avatars").remove(paths);
    }
  } catch {
    // ignore
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return jsonResponse(
      { success: false, message: deleteError.message, code: "DELETE_FAILED" },
      500,
    );
  }

  return jsonResponse({ success: true, message: "Account deleted" });
});
