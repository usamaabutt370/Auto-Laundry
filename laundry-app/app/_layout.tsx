import "@/lib/chat-push-background";

import { Stack } from "expo-router";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

import { AppAlertProvider } from "@/components/app-alert";
import { FcmNotificationRouter } from "@/components/chat/fcm-notification-router";
import { WebAppShell } from "@/components/web-shells";
import { strings } from "@/constants/strings";
import { AuthProvider } from "@/contexts/auth-context";
import { CustomerOrderDraftProvider } from "@/contexts/customer-order-draft-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardProvider>
        <AuthProvider>
          <LocaleProvider>
            <CustomerOrderDraftProvider>
            <AppAlertProvider>
            <WebAppShell>
              <FcmNotificationRouter />
              <Stack
                screenOptions={{
                  headerShown: false,
                  ...(Platform.OS === "web"
                    ? { header: () => null, title: "", headerTitle: "" }
                    : {}),
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen
                  name="(auth)"
                  options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                    gestureEnabled: true,
                    ...(Platform.OS === "ios"
                      ? { gestureDirection: "vertical" as const }
                      : {}),
                  }}
                />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(partner)" />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: strings.common.modal }}
                />
              </Stack>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            </WebAppShell>
            </AppAlertProvider>
            </CustomerOrderDraftProvider>
          </LocaleProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
