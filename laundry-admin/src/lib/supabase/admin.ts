import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Server-only client (service role). Bypasses RLS. Never import from Client Components.
 */
export function createSupabaseAdminClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !serviceRoleKey?.trim()) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or a Supabase key (SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
