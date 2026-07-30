import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Buckets that key objects by `{uid}/...` — best-effort cleanup before deleting the user. */
const USER_PREFIXED_BUCKETS = ["avatars", "business-images"];

async function deleteUserStorageObjects(
  supabase: ReturnType<typeof createClient>,
  uid: string,
): Promise<void> {
  for (const bucket of USER_PREFIXED_BUCKETS) {
    try {
      const { data: files, error } = await supabase.storage.from(bucket).list(uid);
      if (error || !files?.length) continue;
      const paths = files.map((f) => `${uid}/${f.name}`);
      await supabase.storage.from(bucket).remove(paths);
    } catch (e) {
      console.error(`delete-account: storage cleanup failed for bucket ${bucket}`, e);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify the caller from their own JWT — never trust a client-supplied user id.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Anonymize records the other party needs to keep (orders, chat, feedback, disputes)
    // before the hard delete below — these columns are nullable + ON DELETE SET NULL,
    // so this step is actually redundant with the cascade, but keeping it explicit makes
    // failures visible before we touch auth.users.
    const anonymizeSteps: Array<() => Promise<{ error: unknown }>> = [
      () => admin.from("customer_orders").update({ customer_id: null }).eq("customer_id", uid),
      () => admin.from("customer_orders").update({ partner_id: null }).eq("partner_id", uid),
      () => admin.from("chat_conversations").update({ created_by: null }).eq("created_by", uid),
      () => admin.from("chat_messages").update({ sender_id: null }).eq("sender_id", uid),
      () =>
        admin.from("customer_order_feedback").update({ customer_id: null }).eq("customer_id", uid),
      () =>
        admin.from("customer_order_feedback").update({ partner_id: null }).eq("partner_id", uid),
      () => admin.from("order_disputes").update({ customer_id: null }).eq("customer_id", uid),
      () => admin.from("order_disputes").update({ partner_id: null }).eq("partner_id", uid),
    ];

    for (const step of anonymizeSteps) {
      const { error } = await step();
      if (error) {
        console.error("delete-account: anonymize step failed", error);
        return new Response(JSON.stringify({ error: "Failed to prepare account for deletion" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await deleteUserStorageObjects(admin, uid);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      console.error("delete-account: deleteUser failed", deleteErr);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account: unexpected error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
