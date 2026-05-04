/**
 * Must load before React. Registers FCM background handler (data-only on iOS;
 * Android may run for notification+data depending on priority).
 */
import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async () => {
  // No-op: server shows system notification; extend for silent sync if needed.
});
