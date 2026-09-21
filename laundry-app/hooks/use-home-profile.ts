import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { subscribeProfileAvatarUpdated } from "@/lib/profile-avatar-refresh";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";

function metaAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const meta = user?.user_metadata ?? {};
  const raw = [meta.avatar_url, meta.picture, meta.image_url].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return raw?.trim();
}

export function useHomeProfile() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(() => metaAvatarUrl(user));

  const load = useCallback(async () => {
    if (!user?.id) {
      setFirstName("");
      setAvatarUri(undefined);
      return;
    }

    const metaFirst =
      (user?.user_metadata?.first_name as string | undefined)?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim()?.split(/\s+/)[0];
    if (metaFirst) setFirstName(metaFirst);

    const metadataAvatar = metaAvatarUrl(user);
    if (metadataAvatar) setAvatarUri((current) => current ?? metadataAvatar);

    if (!isSupabaseConfigured()) return;
    const { data: sessionData } = await getSession();
    const currentUser = sessionData?.session?.user ?? user;
    if (!currentUser?.id || !supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name,first_name,image_url,updated_at")
      .eq("id", currentUser.id)
      .maybeSingle<{
        full_name: string | null;
        first_name: string | null;
        image_url: string | null;
        updated_at: string | null;
      }>();
    const resolved =
      (data?.first_name ?? "").trim() ||
      (data?.full_name ?? "").trim().split(/\s+/)[0] ||
      metaFirst ||
      "";
    setFirstName(resolved);
    setAvatarUri(
      avatarUrlWithCacheBuster(data?.image_url, data?.updated_at) ??
        metaAvatarUrl(currentUser) ??
        metadataAvatar,
    );
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return subscribeProfileAvatarUpdated(() => {
      void load();
    });
  }, [load]);

  return { firstName, avatarUri, isLoggedIn: Boolean(user) };
}
