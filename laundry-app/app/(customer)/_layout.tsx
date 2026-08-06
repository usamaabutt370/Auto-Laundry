import { Stack } from "expo-router";
import { Platform } from "react-native";

import { WebAreaShell } from "@/components/web-layout";

export default function CustomerLayout() {
  return (
    <WebAreaShell area="customer">
      <Stack
        screenOptions={{
          headerShown: false,
          ...(Platform.OS === "web"
            ? { header: () => null, title: "", headerTitle: "" }
            : {}),
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recurring" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="contact-support" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="pickup-services" />
        <Stack.Screen name="dry-clean-itemized-by-user" />
        <Stack.Screen name="tailoring-itemized-by-user" />
        <Stack.Screen name="laundry-bags" />
        <Stack.Screen name="wash-fold-order" />
        <Stack.Screen name="laundry-bag-detail" />
        <Stack.Screen name="schedule-pickup" />
        <Stack.Screen name="schedule-delivery" />
        <Stack.Screen name="order-summary" />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="chat/[orderId]" />
        <Stack.Screen
          name="pick-launderer"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="launderer-detail" />
      </Stack>
    </WebAreaShell>
  );
}
