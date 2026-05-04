import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { CHAT_FCM_ANDROID_CHANNEL_ID } from "@/constants/chat-push";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

let tokenRefreshUnsub: undefined | (() => void);

async function persistToken(token: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const { error } = await supabase.rpc("register_fcm_push_token", {
    p_token: token,
    p_platform: platform,
  });
  if (error) {
    console.warn("[fcm] register_fcm_push_token:", error.message);
  }
}

export async function registerForChatPush(_userId: string): Promise<void> {
  void _userId;
  if (!isSupabaseConfigured() || !supabase) return;

  const status = await messaging().requestPermission();
  const ok =
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL;
  if (!ok) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHAT_FCM_ANDROID_CHANNEL_ID, {
      name: "Chat",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
    });
  }

  if (Platform.OS === "ios") {
    await messaging().registerDeviceForRemoteMessages();
  }

  const token = await messaging().getToken();
  if (!token) return;

  await persistToken(token);

  tokenRefreshUnsub?.();
  tokenRefreshUnsub = messaging().onTokenRefresh((newToken) => {
    void persistToken(newToken);
  });
}

export async function unregisterChatPush(userId: string): Promise<void> {
  tokenRefreshUnsub?.();
  tokenRefreshUnsub = undefined;

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const token = await messaging().getToken();
    if (token) {
      await supabase.from("user_push_tokens").delete().eq("user_id", userId).eq("token", token);
    } else {
      await supabase.from("user_push_tokens").delete().eq("user_id", userId);
    }
  } catch {
    await supabase.from("user_push_tokens").delete().eq("user_id", userId);
  }

  try {
    await messaging().deleteToken();
  } catch {
    /* ignore */
  }
}

export function onForegroundChatMessage(
  handler: (m: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onMessage(handler);
}
