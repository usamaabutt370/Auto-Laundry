import { useEffect, useRef } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";

import { useAuth } from "@/contexts/auth-context";
import { onForegroundChatMessage } from "@/lib/push-notifications";

/**
 * Routes push-notification taps to the right screen (chat or order detail).
 */
export function FcmNotificationRouter() {
  const { role, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const roleRef = useRef(role);
  roleRef.current = role;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const lastHandledTapRef = useRef<string>("");

  const normalizeData = (raw: unknown): Record<string, string> => {
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v == null) continue;
      out[k] = String(v);
    }
    return out;
  };

  const routeFromData = (data: Record<string, string>) => {
    const orderId = data.orderId ?? data.order_id ?? "";
    if (!orderId) return;

    const isChat =
      Boolean(data.conversationId || data.conversation_id || data.messageId || data.message_id) ||
      data.type === "chat_message";

    const currentRole = roleRef.current;
    if (isChat) {
      if (currentRole === "launderer") {
        router.push(`/(partner)/chat/${orderId}`);
      } else {
        router.push(`/(customer)/chat/${orderId}`);
      }
      return;
    }

    if (currentRole === "launderer") {
      router.push({ pathname: "/(partner)/order-detail", params: { orderId } });
    } else {
      router.push({ pathname: "/(customer)/order-detail", params: { orderId } });
    }
  };

  const handleTapData = (data: Record<string, string>) => {
    const dedupeKey = [
      data.messageId ?? data.message_id ?? "",
      data.conversationId ?? data.conversation_id ?? "",
      data.orderId ?? data.order_id ?? "",
      data.type ?? "",
    ].join("|");
    if (dedupeKey && dedupeKey === lastHandledTapRef.current) return;
    lastHandledTapRef.current = dedupeKey;
    routeFromData(data);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleTapData(normalizeData(remoteMessage?.data));
    });

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        handleTapData(normalizeData(remoteMessage?.data));
      });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleTapData(normalizeData(response.notification.request.content.data));
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handleTapData(normalizeData(response.notification.request.content.data));
    });

    return () => {
      unsubOpened();
      responseSub.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const unsubForeground = onForegroundChatMessage((remoteMessage) => {
      const currentPath = pathnameRef.current ?? "";
      const isOnAnyChatScreen = /\/chat\/[^/]+$/.test(currentPath);

      // No foreground alert when user is already inside chat.
      if (isOnAnyChatScreen) return;

      const title = remoteMessage?.notification?.title?.trim() || "New message";
      const body = remoteMessage?.notification?.body?.trim() || "Open to read";

      void Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: remoteMessage?.data ?? {},
          sound: "default",
        },
        trigger: null,
      });
    });

    return () => {
      unsubForeground();
    };
  }, [isAuthenticated]);

  return null;
}
