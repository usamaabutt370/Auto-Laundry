import Constants from 'expo-constants';

/** App config injected from app.config.js `extra` (populated from .env) */
const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

export const env = {
  supabaseUrl: extra?.supabaseUrl ?? '',
  supabaseAnonKey: extra?.supabaseAnonKey ?? '',
};
