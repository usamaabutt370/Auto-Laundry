// Central place for phone OTP logic.
// Right now this is a stub so the app flow works without an SMS provider.
// In the future, you only need to update the implementations here to:
// - Call your backend / Supabase function to generate & store an OTP
// - Trigger an SMS send via Twilio / local gateway
// - Verify the OTP and mark the phone as verified

export async function requestPhoneOtp(phone: string) {
  if (!phone) return;

  // TODO: Replace this with a real API call that:
  // 1) Generates a secure OTP on the server
  // 2) Stores it (e.g. in a phone_otps table)
  // 3) Sends the OTP via SMS

  // For now, we just simulate a small delay so the UI can show loading if needed.
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<{
  success: boolean;
  errorMessage?: string;
}> {
  if (!phone || !code) {
    return { success: false, errorMessage: "Missing phone or code." };
  }

  // TODO: Replace this with a real verification call to your backend, e.g.:
  // const { data, error } = await supabase.rpc('verify_phone_otp', { phone, code });
  // if (error || !data?.success) return { success: false, errorMessage: error?.message ?? 'Invalid code' };

  // For now, always succeed so the flow keeps working without SMS.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true };
}

