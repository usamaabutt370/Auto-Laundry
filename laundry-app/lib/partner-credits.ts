import { supabase } from "@/lib/supabase";

export const PARTNER_WELCOME_CREDITS = 2000;
export const PARTNER_ORDER_DEDUCTION_RATE_PERCENT = 10;

export interface WelcomeCreditsResult {
  awarded: number;
  balance: number;
}

export type PartnerAcceptCreditCheck =
  | { ok: true; balance: number; required: number }
  | { ok: false; balance: number; required: number };

/** Same formula as charge_partner_credits_for_order in SQL. */
export function estimateOrderCreditCharge(
  orderAmount: number,
  ratePct: number = PARTNER_ORDER_DEDUCTION_RATE_PERCENT,
): number {
  if (!Number.isFinite(orderAmount) || orderAmount <= 0 || ratePct <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil((orderAmount * ratePct) / 100));
}

export async function fetchPartnerCreditBalance(): Promise<number> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("partner_credit_accounts")
    .select("balance")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Number(data?.balance ?? 0);
}

/**
 * Launderers need credits to accept: balance must be greater than zero, and
 * enough to cover the eventual order charge (10% of estimated total, min 1).
 */
export async function checkPartnerCanAcceptOrder(
  orderAmount?: number | null,
): Promise<PartnerAcceptCreditCheck> {
  const balance = await fetchPartnerCreditBalance();
  const required = estimateOrderCreditCharge(Number(orderAmount ?? 0));
  if (balance <= 0 || (required > 0 && balance < required)) {
    return { ok: false, balance, required: Math.max(required, 1) };
  }
  return { ok: true, balance, required };
}

export function isInsufficientCreditsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("insufficient credits");
}

export function buildCreditsRechargeWhatsAppMessage(
  partnerName: string,
  balance: number,
): string {
  const name = partnerName.trim() || "Partner";
  return `Hello! I am ${name} and I would like to buy credits. My current balance is ${balance.toLocaleString()} credits.`;
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
