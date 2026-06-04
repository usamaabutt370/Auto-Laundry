/// <reference path="../deno-globals.d.ts" />
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
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ success: false, message: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const bearerToken = authHeader.slice("Bearer ".length).trim();
  if (!bearerToken || bearerToken.split(".").length !== 3) {
    return jsonResponse(
      { success: false, message: "Invalid session token. Please sign in again.", code: "UNAUTHORIZED" },
      401,
    );
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
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_deleted")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return jsonResponse(
      { success: false, message: profileError.message, code: "CHECK_FAILED" },
      500,
    );
  }

  if (profile?.is_deleted) {
    return jsonResponse(
      { success: false, message: "Account is already deleted.", code: "ALREADY_DELETED" },
      409,
    );
  }

  const { error: deleteError } = await admin
    .from("profiles")
    .update({
      is_deleted: true,
      deactivated_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  if (deleteError) {
    return jsonResponse(
      { success: false, message: deleteError.message, code: "DELETE_FAILED" },
      500,
    );
  }

  await admin
    .from("user_push_tokens")
    .update({ is_active: false, updated_at: now })
    .eq("user_id", userId);

  // Do not global sign-out here — it invalidates the JWT before the app reads the
  // success response and causes a misleading "invalid JWT" error. The app signs out locally.
  return jsonResponse({
    success: true,
    message: "Account deleted. Sign up again with the same phone number to restore your account.",
  });
});
