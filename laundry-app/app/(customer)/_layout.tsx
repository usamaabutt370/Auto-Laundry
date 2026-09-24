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
        <Stack.Screen name="pick-launderer" />
        <Stack.Screen name="launderer-detail" />
        <Stack.Screen
          name="book-service"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="dry-clean-itemized-by-user" />
        <Stack.Screen name="tailoring-itemized-by-user" />
        <Stack.Screen name="laundry-bags" />
        <Stack.Screen name="wash-fold-order" />
        <Stack.Screen name="press-order" />
        <Stack.Screen name="laundry-bag-detail" />
        <Stack.Screen
          name="schedule-pickup"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="schedule-delivery" />
        <Stack.Screen
          name="order-summary"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="order-confirmation"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            gestureEnabled: false,
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="track-order" />
        <Stack.Screen name="chat/[orderId]" />
      </Stack>
    </WebAreaShell>
  );
}
