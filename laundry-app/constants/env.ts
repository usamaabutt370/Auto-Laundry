import Constants from "expo-constants";

/** App config injected from app.config.js `extra` (populated from .env) */
const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

// Also read directly from EXPO_PUBLIC_* envs at runtime as a fallback.
const publicUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase JS expects project root URL, not `/rest/v1`. */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.replace(/\/rest\/v1$/i, "");
}

const rawUrl = extra?.supabaseUrl || publicUrl || "";

export const env = {
  supabaseUrl: rawUrl ? normalizeSupabaseUrl(rawUrl) : "",
  supabaseAnonKey: extra?.supabaseAnonKey || publicAnon || "",
};
