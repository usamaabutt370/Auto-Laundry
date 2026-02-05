import { createClient, type Session } from '@supabase/supabase-js';

import { env } from '@/constants/env';

/**
 * Supabase client for auth and data. Uses URL and anon key from .env (via app.config.js extra).
 * Auth/data calls will fail until Developer B provides real keys and they are set in .env.
 */
export const supabase =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey)
    : (null as unknown as ReturnType<typeof createClient>);

/** True when .env has Supabase URL and anon key (real auth/data available). */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Get current session. Returns null if Supabase is not configured or no session. */
export async function getSession(): Promise<{ data: { session: Session | null } }> {
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
