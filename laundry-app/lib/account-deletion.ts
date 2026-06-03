import { FunctionsHttpError } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

type DeleteAccountResponse = {
  success: boolean;
  message?: string;
  code?: string;
};

async function messageFromInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as DeleteAccountResponse | null;
      if (body?.message) return body.message;
    } catch {
      // ignore JSON parse errors
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("non-2xx")) {
      return "Account deletion is unavailable right now. Please try again later or contact support.";
    }
    return error.message;
  }

  return "Could not delete account. Please try again.";
}

export async function deleteUserAccount(): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, message: "You are not signed in." };
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });

  if (error) {
    return {
      ok: false,
      message: await messageFromInvokeError(error),
    };
  }

  const body = data as DeleteAccountResponse | null;

  if (!body?.success) {
    return {
      ok: false,
      message:
        body?.message ||
        "Could not delete account. If you have past orders, contact support.",
      code: body?.code,
    };
  }

  return { ok: true };
}
