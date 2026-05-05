import { useEffect, useRef } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";

import { useAuth } from "@/contexts/auth-context";
import { onForegroundChatMessage } from "@/lib/push-notifications";

/**
 * Opens the order chat when the user taps an FCM notification (cold start or background).
 */
export function FcmNotificationRouter() {
  const { role, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const roleRef = useRef(role);
  roleRef.current = role;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!isAuthenticated) return;

    const go = (orderId: string) => {
      const r = roleRef.current;
      if (r === "launderer") {
        router.push(`/(partner)/chat/${orderId}`);
      } else {
        router.push(`/(customer)/chat/${orderId}`);
      }
    };

    const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      const orderId = remoteMessage?.data?.orderId;
      if (typeof orderId === "string" && orderId.length > 0) {
        go(orderId);
      }
    });

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        const orderId = remoteMessage?.data?.orderId;
        if (typeof orderId === "string" && orderId.length > 0) {
          go(orderId);
        }
      });

    return () => {
      unsubOpened();
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
