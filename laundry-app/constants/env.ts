import Constants from "expo-constants";

/** App config injected from app.config.js `extra` (populated from .env) */
const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string; stripePublishableKey?: string }
  | undefined;

// Also read directly from EXPO_PUBLIC_* envs at runtime as a fallback.
const publicUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const publicStripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export const env = {
  supabaseUrl: extra?.supabaseUrl || publicUrl || "",
  supabaseAnonKey: extra?.supabaseAnonKey || publicAnon || "",
  stripePublishableKey: extra?.stripePublishableKey || publicStripeKey || "",
};
