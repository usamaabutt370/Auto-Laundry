// Supabase Edge Function: create-payment-intent
// Required secret in Supabase project:
// - STRIPE_SECRET_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Payload = {
  orderId?: string;
  amount?: number;
  currency?: string;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? "usd").toLowerCase();
  const orderId = String(body.orderId ?? "");

  if (!orderId) {
    return new Response(JSON.stringify({ error: "orderId is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ error: "amount must be > 0." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const amountInMinor = Math.round(amount * 100);
  const paymentBody = new URLSearchParams({
    amount: String(amountInMinor),
    currency,
    "metadata[order_id]": orderId,
    automatic_payment_methods: "enabled",
  });

  const stripeResp = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: paymentBody.toString(),
  });

  const stripeJson = await stripeResp.json();
  if (!stripeResp.ok) {
    return new Response(
      JSON.stringify({
        error: stripeJson?.error?.message ?? "Failed to create payment intent.",
      }),
      {
        status: stripeResp.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      clientSecret: stripeJson.client_secret,
      paymentIntentId: stripeJson.id,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
