import { Stack } from "expo-router";

import { PartnerSidebar } from "@/components/partner-sidebar";
import { WebAreaShell } from "@/components/web-layout";
import { MerchantServicesProvider } from "@/contexts/merchant-services-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

/** Ensure "/(partner)" opens the tabs (Dashboard), not bare index. */
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

/**
 * Partner area: Dashboard (index) with sidebar, plus Order, Settings, Profile, Support, FAQ.
 * Onboarding when first becoming a launderer. Root redirects partners to (partner) = Dashboard.
 * Settings is a folder: index (Screen 1), add-service (Screen 2), edit-service (Screen 3).
 */
export default function PartnerLayout() {
  return (
    <SidebarProvider>
      <MerchantServicesProvider>
        <PartnerSidebar />
        <WebAreaShell area="partner">
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="(tabs)"
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard-orders" />
          <Stack.Screen name="earnings-history" />
          <Stack.Screen name="order" />
          <Stack.Screen name="order-detail" />
          <Stack.Screen name="chat/[orderId]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="laundrerinfo" />
          <Stack.Screen name="business-detail" />
          <Stack.Screen name="support" />
          <Stack.Screen name="faq" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
        </Stack>
        </WebAreaShell>
      </MerchantServicesProvider>
    </SidebarProvider>
  );
}
