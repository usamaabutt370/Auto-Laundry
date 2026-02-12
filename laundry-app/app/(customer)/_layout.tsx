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
      </Stack>
    </SidebarProvider>
  );
}
