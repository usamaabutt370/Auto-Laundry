import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { strings } from "@/constants/strings";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  initialRouteName: "index",
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const timeout = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LocaleProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(partner)" />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: strings.common.modal }}
            />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </LocaleProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
