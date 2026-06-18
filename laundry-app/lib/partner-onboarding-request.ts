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

type PartnerProfileFallbackRow = {
  business_name: string | null;
  business_description: string | null;
  phone_number: string | null;
  address: string | null;
  available_time: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return (value ?? "").trim().length > 0;
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

  // Fallback for older DB states where partner_onboarding_requests is empty/missing:
  // infer whether onboarding has likely been submitted from persisted profile + services.
  if (!error && !data) {
    const [{ data: profileData, error: profileError }, { count: serviceCount, error: serviceError }] =
      await Promise.all([
        supabase
          .from("partner_profiles")
          .select("business_name,business_description,phone_number,address,available_time")
          .eq("id", userId)
          .maybeSingle<PartnerProfileFallbackRow>(),
        supabase
          .from("partner_services")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

    if (profileError || serviceError) {
      return { data: null, error: null as Error | null };
    }

    const hasCoreProfile =
      hasText(profileData?.business_name) &&
      hasText(profileData?.business_description) &&
      hasText(profileData?.phone_number) &&
      hasText(profileData?.address) &&
      hasText(profileData?.available_time);
    const hasServices = (serviceCount ?? 0) > 0;

    if (hasCoreProfile && hasServices) {
      return {
        data: {
          status: "submitted" as PartnerOnboardingRequestStatus,
          rejection_reason: null,
          submitted_at: null,
          reviewed_at: null,
        } satisfies PartnerOnboardingRequestRow,
        error: null as Error | null,
      };
    }
  }

  return {
    data: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}
