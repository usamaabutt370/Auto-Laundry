import { isMissingPartnerOnboardingRequestsTableError } from "@/lib/partner-onboarding-request";
import { type PartnerRiderInput } from "@/lib/partner-riders";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PartnerOnboardingServiceLine = {
  name: string;
  category: string;
  priceDisplay: string;
};

export type SubmitPartnerOnboardingKycParams = {
  userId: string;
  pickupDeliveryEnabled: boolean;
  pickupDeliveryAmount: string;
  serviceLines: PartnerOnboardingServiceLine[];
  riders?: PartnerRiderInput[];
  ridersResponsibilityAccepted?: boolean;
};

export type SubmitPartnerOnboardingKycResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string; code?: "missing_table" | "validation" };

export async function submitPartnerOnboardingKyc(
  params: SubmitPartnerOnboardingKycParams,
): Promise<SubmitPartnerOnboardingKycResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase is not configured.", code: "validation" };
  }

  const {
    userId,
    pickupDeliveryEnabled,
    pickupDeliveryAmount,
    serviceLines,
    riders = [],
    ridersResponsibilityAccepted = false,
  } = params;

  if (serviceLines.length === 0) {
    return { ok: false, error: "Please add at least one service before submitting.", code: "validation" };
  }

  if (pickupDeliveryEnabled) {
    if (!ridersResponsibilityAccepted) {
      return {
        ok: false,
        error: "Please accept rider responsibility before submitting.",
        code: "validation",
      };
    }
    const validRiders = riders.filter(
      (rider) =>
        rider.name.trim().length > 0 &&
        rider.phone.trim().length > 0 &&
        rider.photoUrl.trim().length > 0,
    );
    if (validRiders.length === 0) {
      return {
        ok: false,
        error: "Please add at least one rider with name, phone, and a clear face photo.",
        code: "validation",
      };
    }
  }

  const normalizedPickupAmount = (pickupDeliveryAmount ?? "").trim();
  const kycStatus = "submitted" as const;

  const { data: existingPartnerProfile, error: existingPartnerProfileError } = await supabase
    .from("partner_profiles")
    .select(
      "business_name,business_description,phone_number,address,available_time,latitude,longitude,business_images",
    )
    .eq("id", userId)
    .maybeSingle<{
      business_name: string | null;
      business_description: string | null;
      phone_number: string | null;
      address: string | null;
      available_time: string | null;
      latitude: number | null;
      longitude: number | null;
      business_images: string[] | null;
    }>();

  if (existingPartnerProfileError) {
    return { ok: false, error: `Could not load business profile. ${existingPartnerProfileError.message}` };
  }

  const businessName = (existingPartnerProfile?.business_name ?? "").trim();
  const businessDescription = (existingPartnerProfile?.business_description ?? "").trim();
  const phoneNumber = (existingPartnerProfile?.phone_number ?? "").trim();
  const address = (existingPartnerProfile?.address ?? "").trim();
  const availableTime = (existingPartnerProfile?.available_time ?? "").trim();
  const businessImages = Array.isArray(existingPartnerProfile?.business_images)
    ? existingPartnerProfile.business_images.filter((img) => typeof img === "string" && img.trim().length > 0)
    : [];

  if (!businessName || !businessDescription || !phoneNumber || !address || !availableTime) {
    return {
      ok: false,
      error: "Please complete business details before submitting KYC.",
      code: "validation",
    };
  }

  const profileUpdate: {
    id: string;
    pickup_delivery_enabled: boolean;
    pickup_delivery_amount: string;
    riders_responsibility_accepted_at: string | null;
    updated_at: string;
  } = {
    id: userId,
    pickup_delivery_enabled: Boolean(pickupDeliveryEnabled),
    pickup_delivery_amount: normalizedPickupAmount,
    riders_responsibility_accepted_at: pickupDeliveryEnabled
      ? new Date().toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error: partnerProfileSaveError } = await supabase
    .from("partner_profiles")
    .upsert(profileUpdate, { onConflict: "id" });

  if (partnerProfileSaveError) {
    return { ok: false, error: `Could not save partner profile. ${partnerProfileSaveError.message}` };
  }

  const notesPayload = {
    businessProfile: {
      businessName,
      businessDescription,
      phoneNumber,
      address,
      availableTime,
      latitude: existingPartnerProfile?.latitude ?? null,
      longitude: existingPartnerProfile?.longitude ?? null,
      businessImages,
    },
    servicePricing: {
      pickupDeliveryEnabled: Boolean(pickupDeliveryEnabled),
      pickupDeliveryAmount: normalizedPickupAmount,
    },
    serviceLines,
    riders: pickupDeliveryEnabled
      ? riders.map((rider) => ({
          name: rider.name.trim(),
          phone: rider.phone.trim(),
          photoUrl: rider.photoUrl.trim(),
        }))
      : [],
    ridersResponsibilityAccepted: pickupDeliveryEnabled ? ridersResponsibilityAccepted : false,
  };

  let notesSerialized = "";
  try {
    notesSerialized = JSON.stringify(notesPayload);
  } catch {
    return { ok: false, error: "Could not prepare KYC snapshot.", code: "validation" };
  }

  const submittedAt = new Date().toISOString();
  const kycPayload = {
    user_id: userId,
    status: kycStatus,
    submitted_at: submittedAt,
    updated_at: submittedAt,
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    notes: notesSerialized,
  };

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("partner_onboarding_requests")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string }>();

  if (existingRequestError) {
    if (isMissingPartnerOnboardingRequestsTableError(existingRequestError)) {
      return {
        ok: false,
        error:
          "The partner KYC table has not been created in Supabase yet. Run `npx supabase db push` from `laundry-app`, then try again.",
        code: "missing_table",
      };
    }
    return { ok: false, error: existingRequestError.message };
  }

  if (existingRequest) {
    return { ok: true, created: false };
  }

  const insertResult = await supabase.from("partner_onboarding_requests").insert(kycPayload);
  if (insertResult.error) {
    if (isMissingPartnerOnboardingRequestsTableError(insertResult.error)) {
      return {
        ok: false,
        error:
          "The partner KYC table has not been created in Supabase yet. Run `npx supabase db push` from `laundry-app`, then try again.",
        code: "missing_table",
      };
    }
    return { ok: false, error: insertResult.error.message };
  }

  return { ok: true, created: true };
}
