import { supabase } from "@/lib/supabase";

export type PartnerOnboardingRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export interface PartnerOnboardingRequestRow {
  status: PartnerOnboardingRequestStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export function isMissingPartnerOnboardingRequestsTableError(error: {
  message?: string | null;
} | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("partner_onboarding_requests") &&
    (message.includes("schema cache") || message.includes("could not find the table"))
  );
}

export async function fetchPartnerOnboardingRequest(userId: string) {
  if (!supabase) return { data: null, error: null as Error | null };

  const { data, error } = await supabase
    .from("partner_onboarding_requests")
    .select("status,rejection_reason,submitted_at,reviewed_at")
    .eq("user_id", userId)
    .maybeSingle<PartnerOnboardingRequestRow>();

  if (isMissingPartnerOnboardingRequestsTableError(error)) {
    return { data: null, error: null as Error | null };
  }

  return {
    data: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}
