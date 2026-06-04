import { FunctionsHttpError } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

export type ReactivateAccountResult =
  | { ok: true; email: string; role: string | null }
  | { ok: false; message: string; code?: string };

type AccountFunctionResponse = {
  success: boolean;
  message?: string;
  code?: string;
  email?: string;
  role?: string | null;
};

async function messageFromInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as AccountFunctionResponse | null;
      if (body?.message) return body.message;
    } catch {
      // ignore JSON parse errors
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("non-2xx")) {
      return "Something went wrong. Please try again later or contact support.";
    }
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function isLikelyPostDeleteAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid jwt") ||
    lower.includes("invalid number of segments") ||
    lower.includes("unable to parse or verify") ||
    lower.includes("token is malformed")
  );
}

/** Valid access JWT for Edge Functions (refresh if cached session token is missing or corrupt). */
async function getAccessTokenForFunctions(): Promise<string | null> {
  if (!supabase) return null;

  const isJwt = (token: string | undefined | null) =>
    Boolean(token && token.split(".").length === 3);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (isJwt(session?.access_token)) {
    return session!.access_token;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return null;
  }

  const token = refreshed.session?.access_token;
  return isJwt(token) ? token! : null;
}

/** Soft-delete: sets is_deleted; auth user and order history are preserved. */
export async function deleteUserAccount(): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, message: "You are not signed in." };
  }

  const accessToken = await getAccessTokenForFunctions();
  if (!accessToken) {
    return {
      ok: false,
      message: "Your session expired. Please sign out, sign in again, then try deleting your account.",
    };
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = data as AccountFunctionResponse | null;

  if (error) {
    const message = await messageFromInvokeError(error);
    if (isLikelyPostDeleteAuthError(message) && (await isCurrentUserDeleted())) {
      return { ok: true };
    }
    return { ok: false, message };
  }

  if (!body?.success) {
    if (body?.code === "ALREADY_DELETED") {
      return { ok: true };
    }
    return {
      ok: false,
      message: body?.message || "Could not delete account. Please try again.",
      code: body?.code,
    };
  }

  return { ok: true };
}

/** Restore a deleted account on sign-up (same phone); updates password and clears is_deleted. */
export async function reactivateDeletedAccount(params: {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<ReactivateAccountResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("reactivate-account", {
    method: "POST",
    body: {
      phone: params.phone,
      password: params.password,
      first_name: params.firstName,
      last_name: params.lastName,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await messageFromInvokeError(error),
    };
  }

  const body = data as AccountFunctionResponse | null;

  if (!body?.success || !body.email) {
    return {
      ok: false,
      message: body?.message || "Could not restore account. Please try again.",
      code: body?.code,
    };
  }

  return { ok: true, email: body.email, role: body.role ?? null };
}

export async function isCurrentUserDeleted(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return false;

  const { data, error } = await supabase.rpc("is_current_user_deleted");

  if (error) return false;
  return Boolean(data);
}
