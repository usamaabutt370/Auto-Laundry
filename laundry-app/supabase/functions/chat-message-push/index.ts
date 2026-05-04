import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-chat-push-secret",
};

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: {
    id?: string;
    conversation_id?: string;
    sender_id?: string;
    body?: string | null;
  };
}

/** Must match app channel in `constants/chat-push.ts` (Android 8+). */
const CHAT_FCM_ANDROID_CHANNEL_ID = "chat_messages";

function normalizeWebhookPayload(raw: unknown): WebhookPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    o.type === "INSERT" &&
    o.table === "chat_messages" &&
    o.record &&
    typeof o.record === "object"
  ) {
    return o as unknown as WebhookPayload;
  }
  if (o.payload != null) {
    const inner: unknown =
      typeof o.payload === "string" ? JSON.parse(o.payload as string) : o.payload;
    return normalizeWebhookPayload(inner);
  }
  return null;
}

function parseServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  return sa;
}

function b64urlEncode(data: Uint8Array): string {
  let s = "";
  for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i]!);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToB64Url(text: string): string {
  return b64urlEncode(new TextEncoder().encode(text));
}

async function importServiceAccountKey(pem: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const keyData = pem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binary = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function mintAccessToken(sa: ServiceAccount): Promise<string> {
  const header = textToB64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = textToB64Url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  );
  const unsigned = `${header}.${payload}`;
  const key = await importServiceAccountKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlEncode(new Uint8Array(signature))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OAuth token failed: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in OAuth response");
  return json.access_token;
}

async function sendFcm(args: {
  accessToken: string;
  projectId: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<{ ok: boolean; invalidToken: boolean }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${args.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: args.token,
          notification: {
            title: args.title,
            body: args.body,
          },
          data: args.data,
          android: {
            priority: "HIGH",
            notification: {
              channel_id: CHAT_FCM_ANDROID_CHANNEL_ID,
              sound: "default",
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        },
      }),
    },
  );
  if (res.ok) return { ok: true, invalidToken: false };

  const errText = await res.text();
  const invalidToken =
    res.status === 404 ||
    errText.includes("NOT_FOUND") ||
    errText.includes("UNREGISTERED") ||
    errText.includes("Requested entity was not found") ||
    errText.includes("registration-token-not-registered");

  console.error(`FCM send failed: ${res.status} ${errText}`);
  return { ok: false, invalidToken };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("CHAT_PUSH_WEBHOOK_SECRET");
    const hdr = req.headers.get("x-chat-push-secret") ?? "";
    if (!secret || hdr !== secret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody: unknown = await req.json();
    const payload = normalizeWebhookPayload(rawBody);

    if (!payload?.record || payload.type !== "INSERT" || payload.table !== "chat_messages") {
      const keys = rawBody && typeof rawBody === "object" ? Object.keys(rawBody as object).join(",") : "";
      console.log("chat-message-push: skipped (unexpected body)", keys || typeof rawBody);
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id: messageId, conversation_id, sender_id, body } = payload.record;
    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "bad record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: conv, error: convErr } = await supabase
      .from("chat_conversations")
      .select("order_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convErr || !conv?.order_id) {
      return new Response(JSON.stringify({ error: "conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orderId = String(conv.order_id);

    const { data: participants, error: pErr } = await supabase
      .from("chat_conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .neq("user_id", sender_id);

    if (pErr) {
      console.error(pErr);
      return new Response(JSON.stringify({ error: "participants query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!participants?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientIds = [...new Set(participants.map((p) => String(p.user_id)))];
    const tokens: string[] = [];
    for (const uid of recipientIds) {
      const { data: rows } = await supabase
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", uid)
        .eq("is_active", true);
      for (const row of rows ?? []) {
        if (row.token) tokens.push(String(row.token));
      }
    }

    const uniqueTokens = [...new Set(tokens)];
    if (uniqueTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sa = parseServiceAccount();
    const accessToken = await mintAccessToken(sa);

    const snippet = (body ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const title = "New message";

    const data: Record<string, string> = {
      orderId,
      conversationId: String(conversation_id),
      messageId: String(messageId ?? ""),
    };

    let sent = 0;
    for (const token of uniqueTokens) {
      const r = await sendFcm({
        accessToken,
        projectId: sa.project_id,
        token,
        title,
        body: snippet || "Open to read",
        data,
      });
      if (r.ok) sent++;
      else if (r.invalidToken) {
        await supabase.from("user_push_tokens").delete().eq("token", token);
      }
    }

    const attempted = uniqueTokens.length;
    console.log(
      `chat-message-push: FCM done sent=${sent} attempted=${attempted} orderId=${orderId.slice(0, 8)}…`,
    );

    return new Response(JSON.stringify({ sent, attempted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
