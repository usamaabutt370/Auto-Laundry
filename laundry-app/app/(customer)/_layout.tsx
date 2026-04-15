import { Stack } from "expo-router";

import { Sidebar } from "@/components/sidebar";
import { CustomerOrderDraftProvider } from "@/contexts/customer-order-draft-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

export default function CustomerLayout() {
  return (
    <SidebarProvider>
      <CustomerOrderDraftProvider>
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
          <Stack.Screen name="dry-clean-itemized-by-user" />
          <Stack.Screen name="tailoring-itemized-by-user" />
          <Stack.Screen name="laundry-bags" />
          <Stack.Screen name="wash-fold-order" />
          <Stack.Screen name="laundry-bag-detail" />
          <Stack.Screen name="schedule-pickup" />
          <Stack.Screen name="schedule-delivery" />
          <Stack.Screen name="order-summary" />
          <Stack.Screen name="payment-method" />
          <Stack.Screen name="payment-success" />
          <Stack.Screen name="pick-launderer" />
          <Stack.Screen name="launderer-detail" />
        </Stack>
      </CustomerOrderDraftProvider>
    </SidebarProvider>
  );
}
