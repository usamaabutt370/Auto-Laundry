import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StripeProvider } from "@stripe/stripe-react-native";

import { env } from "@/constants/env";
import { strings } from "@/constants/strings";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const stripeKey = env.stripePublishableKey;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={stripeKey || "pk_test_placeholder"}>
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
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
