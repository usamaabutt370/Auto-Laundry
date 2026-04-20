import { supabase } from "@/lib/supabase";

export const PARTNER_WELCOME_CREDITS = 2000;
export const PARTNER_ORDER_DEDUCTION_RATE_PERCENT = 10;

export interface WelcomeCreditsResult {
  awarded: number;
  balance: number;
}

export async function awardWelcomeCredits(
  credits: number = PARTNER_WELCOME_CREDITS,
): Promise<WelcomeCreditsResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("award_partner_welcome_credits", {
    p_credits: credits,
  });
  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { awarded: 0, balance: 0 };
  }

  return {
    awarded: Number(row.awarded ?? 0),
    balance: Number(row.balance ?? 0),
  };
}

export function isWelcomeCreditsRpcMissingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("award_partner_welcome_credits") &&
    (message.includes("could not find the function") ||
      message.includes("schema cache"))
  );
}
