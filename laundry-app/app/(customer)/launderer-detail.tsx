import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";

import { showAppAlert } from "@/components/app-alert";
import { LaundererDetailView } from "@/components/launderer-detail-view";
import { strings } from "@/constants/strings";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { reassignRejectedCustomerOrder } from "@/lib/customer-orders";

export default function LaundererDetailScreen() {
  const router = useRouter();
  const { setPartner, editingOrderId } = useCustomerOrderDraft();
  const s = strings.customer.pickLaunderer;
  const params = useLocalSearchParams<{
    id: string | string[];
    name?: string;
    mode?: string;
    service?: string;
    reorderOrderId?: string;
  }>();
  const partnerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const reorderOrderId =
    typeof params.reorderOrderId === "string" ? params.reorderOrderId : "";
  const isReassignMode = reorderOrderId.length > 0;

  if (!partnerId) {
    return <View style={styles.container} />;
  }

  const handleSelect = async (id: string, name: string | null) => {
    if (isReassignMode) {
      try {
        await reassignRejectedCustomerOrder(reorderOrderId, id);
        showAppAlert(s.reassignSuccessTitle, s.reassignSuccessMessage, [
          {
            text: "OK",
            onPress: () => router.replace("/(customer)/(tabs)/order"),
          },
        ]);
      } catch (error) {
        showAppAlert(
          s.reassignErrorTitle,
          error instanceof Error ? error.message : s.reassignErrorMessage,
        );
      }
      return;
    }

    if (editingOrderId) {
      router.replace("/(customer)/pickup-services");
      return;
    }
    setPartner(id, name);
    router.push({
      pathname: "/(customer)/pickup-services",
      params: {
        mode: params.mode === "pickupDelivery" ? "pickupDelivery" : "dropoff",
        ...(typeof params.service === "string" ? { service: params.service } : {}),
      },
    });
  };

  return (
    <LaundererDetailView
      partnerId={partnerId}
      initialName={params.name}
      onBack={() => router.back()}
      onSelect={handleSelect}
      isModal
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "green",
  },
});
