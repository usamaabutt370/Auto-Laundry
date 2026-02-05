/**
 * User roles supported by the app. Align with backend (Supabase profiles/partners).
 */
export type UserRole = 'customer' | 'partner';

/**
 * Minimal user profile as returned from the backend (e.g. profiles table).
 * Extend when backend schema is final.
 */
export interface UserProfile {
  id: string;
  role: UserRole;
  phone?: string;
  // Add other fields (name, avatar_url, etc.) as backend provides them
}
