import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type EnsureProfileResult = { ok: true } | { ok: false; error: string };

function readPhone(user: User): string {
  const metaPhone = user.user_metadata?.phone;
  if (typeof metaPhone === "string" && metaPhone.trim().length > 0) {
    return metaPhone.trim();
  }
  return "";
}

function readEmail(user: User): string {
  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email.trim();
  }
  const metaEmail = user.user_metadata?.email;
  if (typeof metaEmail === "string" && metaEmail.trim().length > 0) {
    return metaEmail.trim();
  }
  const phone = readPhone(user).replace(/\D/g, "");
  if (phone.length > 0) {
    return `${phone}@autolaundry.app`;
  }
  return `${user.id}@autolaundry.app`;
}

function readFullName(user: User): string {
  const metaFullName = user.user_metadata?.full_name;
  if (typeof metaFullName === "string" && metaFullName.trim().length > 0) {
    return metaFullName.trim();
  }
  const first = typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name.trim() : "";
  const last = typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name.trim() : "";
  return `${first} ${last}`.trim();
}

/**
 * Ensures public.profiles has an active row for the signed-in user.
 * Uses bootstrap_user_profile RPC so the first insert bypasses restrictive RLS.
 */
export async function ensureActiveUserProfile(user: User): Promise<EnsureProfileResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const phone = readPhone(user);
  const email = readEmail(user);
  const fullName = readFullName(user);

  if (!phone) {
    return {
      ok: false,
      error: "Your account is missing a phone number. Please sign out and sign in again.",
    };
  }

  const referralFromMeta =
    typeof user.user_metadata?.referral_code === "string"
      ? user.user_metadata.referral_code.trim().toUpperCase()
      : "";

  const { error } = await supabase.rpc("bootstrap_user_profile", {
    p_email: email,
    p_phone: phone,
    p_full_name: fullName || null,
    p_first_name:
      typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : null,
    p_last_name:
      typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : null,
    p_role: "customer",
    p_referral_code: referralFromMeta.length > 0 ? referralFromMeta : null,
  });

  if (!error) {
    return { ok: true };
  }

  if (error.message.includes("bootstrap_user_profile") && error.message.includes("does not exist")) {
    return {
      ok: false,
      error:
        "Database update required. Run `npx supabase db push` from laundry-app, then try again.",
    };
  }

  if (error.message.toLowerCase().includes("account deactivated")) {
    return {
      ok: false,
      error: "This account has been deactivated. Please contact support to continue.",
    };
  }

  return { ok: false, error: error.message };
}
