import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { showAppAlert } from "@/components/app-alert";
import { LaundererDetailView } from "@/components/launderer-detail-view";
import { strings } from "@/constants/strings";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { reassignRejectedCustomerOrder } from "@/lib/customer-orders";
import { parseServiceJob } from "@/lib/service-jobs";

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
    focus?: string;
    presentation?: string;
  }>();
  const partnerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const reorderOrderId =
    typeof params.reorderOrderId === "string" ? params.reorderOrderId : "";
  const isReassignMode = reorderOrderId.length > 0;
  const prefersPickupDelivery = params.mode === "pickupDelivery";
  const scrollToCollect = params.focus === "collect";
  const modalChrome = params.presentation === "modal";

  useEffect(() => {
    if (!partnerId || isReassignMode) return;
    setPartner(partnerId, typeof params.name === "string" ? params.name : null);
  }, [isReassignMode, params.name, partnerId, setPartner]);

  if (!partnerId) {
    return <View style={styles.container} />;
  }

  const handleSelect = async (
    id: string,
    name: string | null,
    options?: { service?: string; job?: string; itemLabel?: string },
  ) => {
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
    const job =
      parseServiceJob(options?.job) ??
      parseServiceJob(options?.service) ??
      parseServiceJob(params.service) ??
      "washAndFold";
    router.push({
      pathname: "/(customer)/book-service",
      params: {
        job,
        partnerId: id,
        ...(name ? { partnerName: name } : {}),
        mode: params.mode === "pickupDelivery" ? "pickupDelivery" : "dropoff",
        ...(options?.itemLabel ? { itemLabel: options.itemLabel } : {}),
      },
    });
  };

  return (
    <LaundererDetailView
      partnerId={partnerId}
      initialName={params.name}
      intentService={typeof params.service === "string" ? params.service : undefined}
      onBack={() => router.back()}
      onSelect={handleSelect}
      isModal
      prefersPickupDelivery={prefersPickupDelivery}
      scrollToCollect={scrollToCollect}
      modalChrome={modalChrome}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
});
