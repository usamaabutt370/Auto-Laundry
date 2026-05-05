import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { CHAT_FCM_ANDROID_CHANNEL_ID } from "@/constants/chat-push";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

let tokenRefreshUnsub: undefined | (() => void);

async function ensureLocalNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

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

  const localPermitted = await ensureLocalNotificationPermission();
  if (!localPermitted) {
    console.warn("[fcm] notification permission not granted");
    return;
  }

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
    try {
      await messaging().registerDeviceForRemoteMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("aps-environment") ||
        message.includes("[messaging/unknown]")
      ) {
        console.warn(
          "[fcm] iOS push entitlement missing. Enable Push Notifications capability and rebuild.",
        );
        return;
      }
      throw error;
    }
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
