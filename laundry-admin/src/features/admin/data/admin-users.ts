import type { AdminUser } from "@/features/admin/types/admin-user";
import { listCustomerProfilesForAdmin } from "@/features/admin/server/users/customer-profiles.repository";

export type { AdminUser };

function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    (process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  );
}

/**
 * Users admin screen: Supabase when URL + service role are set; else in-memory demo.
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_* aliases) in .env.local.",
    );
  }

  return listCustomerProfilesForAdmin();
}
