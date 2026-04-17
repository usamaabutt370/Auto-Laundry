import { Stack } from "expo-router";

import { PartnerSidebar } from "@/components/partner-sidebar";
import { MerchantServicesProvider } from "@/contexts/merchant-services-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

/** Ensure "/(partner)" opens the Dashboard (index), not Orders or (tabs). */
export const unstable_settings = {
  initialRouteName: "index",
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
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="index"
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard-orders" />
          <Stack.Screen name="order" />
          <Stack.Screen name="order-detail" />
          <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="support" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
      </MerchantServicesProvider>
    </SidebarProvider>
  );
}
