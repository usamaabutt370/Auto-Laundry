import { createClient, type Session } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { env } from "@/constants/env";

/**
 * Supabase client for auth and data. URL and anon key come from your .env
 * (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY) via app.config.js → constants/env.
 */
export const supabase =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : (null as unknown as ReturnType<typeof createClient>);

/** True when .env has Supabase URL and anon key (real auth/data available). */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Get current session. Returns null if Supabase is not configured or no session. */
export async function getSession(): Promise<{
  data: { session: Session | null };
}> {
  if (!supabase) return { data: { session: null } };
  return supabase.auth.getSession();
}

/** Subscribe to auth state changes (sign in / sign out). Call returned function to unsubscribe. */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}
