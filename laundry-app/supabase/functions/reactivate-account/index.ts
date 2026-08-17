/// <reference path="../deno-globals.d.ts" />
// @ts-expect-error Supabase Edge Runtime import
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReactivateBody = {
  phone?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

type ReactivateAccountResponse = {
  success: boolean;
  message?: string;
  code?: string;
  email?: string;
  role?: string | null;
};

function jsonResponse(body: ReactivateAccountResponse, status = 200): Response {
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

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, message: "Server configuration error", code: "CONFIG" },
      500,
    );
  }

  let body: ReactivateBody;
  try {
    body = (await req.json()) as ReactivateBody;
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body", code: "BAD_REQUEST" }, 400);
  }

  const phone = body.phone?.trim();
  const password = body.password;
  const firstName = body.first_name?.trim() ?? "";
  const lastName = body.last_name?.trim() ?? "";

  if (!phone || !password || password.length < 6) {
    return jsonResponse(
      {
        success: false,
        message: "Phone and password (min 6 characters) are required.",
        code: "BAD_REQUEST",
      },
      400,
    );
  }

  if (!firstName || !lastName) {
    return jsonResponse(
      { success: false, message: "First and last name are required.", code: "BAD_REQUEST" },
      400,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, is_deleted")
    .eq("phone", phone)
    .maybeSingle();

  if (profileError) {
    return jsonResponse(
      { success: false, message: profileError.message, code: "CHECK_FAILED" },
      500,
    );
  }

  if (!profile) {
    return jsonResponse(
      {
        success: false,
        message: "No deleted account found for this phone number.",
        code: "NOT_FOUND",
      },
      404,
    );
  }

  if (!profile.is_deleted) {
    return jsonResponse(
      {
        success: false,
        message: "This phone number has an active account. Please sign in instead.",
        code: "NOT_DELETED",
      },
      409,
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const now = new Date().toISOString();

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(profile.id, {
    password,
    user_metadata: {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone,
    },
  });

  if (authUpdateError) {
    return jsonResponse(
      { success: false, message: authUpdateError.message, code: "AUTH_UPDATE_FAILED" },
      500,
    );
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      is_deleted: false,
      deactivated_at: null,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      updated_at: now,
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    return jsonResponse(
      { success: false, message: profileUpdateError.message, code: "PROFILE_UPDATE_FAILED" },
      500,
    );
  }

  return jsonResponse({
    success: true,
    message: "Account restored.",
    email: profile.email,
    role: profile.role,
  });
});
