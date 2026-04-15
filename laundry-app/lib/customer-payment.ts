import { supabase } from "@/lib/supabase";

type CreatePaymentIntentInput = {
  orderId: string;
  amount: number;
  currencyPrefix: string;
};

type PaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey?: string;
  customerId?: string;
};

function resolveStripeCurrency(currencyPrefix: string): string {
  const p = currencyPrefix.trim().toLowerCase();
  if (p.startsWith("$")) return "usd";
  if (p.startsWith("pkr") || p.startsWith("rs")) return "pkr";
  return "usd";
}

export async function createOrderPaymentIntent({
  orderId,
  amount,
  currencyPrefix,
}: CreatePaymentIntentInput): Promise<
  { ok: true; data: PaymentIntentResponse } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const currency = resolveStripeCurrency(currencyPrefix);
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: {
      orderId,
      amount,
      currency,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data?.clientSecret || !data?.paymentIntentId) {
    return { ok: false, error: "Invalid payment intent response from server." };
  }
  return {
    ok: true,
    data: {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      ephemeralKey: data.ephemeralKey,
      customerId: data.customerId,
    },
  };
}
