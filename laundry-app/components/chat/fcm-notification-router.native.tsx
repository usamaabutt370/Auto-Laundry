import { useEffect, useRef } from "react";
import messaging from "@react-native-firebase/messaging";
import { router } from "expo-router";

import { useAuth } from "@/contexts/auth-context";

/**
 * Opens the order chat when the user taps an FCM notification (cold start or background).
 */
export function FcmNotificationRouter() {
  const { role, isAuthenticated } = useAuth();
  const roleRef = useRef(role);
  roleRef.current = role;

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

  return null;
}
