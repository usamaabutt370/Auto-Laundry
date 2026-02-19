import { Stack } from "expo-router";

import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";

export default function CustomerLayout() {
  return (
    <SidebarProvider>
      <Sidebar />
      <Stack
        screenOptions={{
          headerShown: false,
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
        <Stack.Screen name="dry-clean-options" />
        <Stack.Screen name="laundry-bags" />
        <Stack.Screen name="laundry-bag-detail" />
        <Stack.Screen name="schedule-pickup" />
      </Stack>
    </SidebarProvider>
  );
}
