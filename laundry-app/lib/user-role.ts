import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

const VALID_ROLES: UserRole[] = ["customer", "launderer"];

/**
 * Reads profiles.role for the authenticated user row. Defaults to customer when missing or invalid.
 */
export async function fetchUserRoleFromProfile(userId: string): Promise<UserRole> {
  if (!supabase) return "customer";
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();
  if (error || !data?.role || !VALID_ROLES.includes(data.role as UserRole)) {
    return "customer";
  }
  return data.role as UserRole;
}
