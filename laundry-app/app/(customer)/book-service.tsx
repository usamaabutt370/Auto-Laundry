import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { ServiceBookingView } from "@/components/service-booking-view";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { parseServiceJob } from "@/lib/service-jobs";

export default function BookServiceScreen() {
  const params = useLocalSearchParams<{
    job?: string;
    service?: string;
    itemLabel?: string;
    mode?: string;
    partnerId?: string;
    partnerName?: string;
  }>();
  const { draft, setPartner } = useCustomerOrderDraft();
  const job = parseServiceJob(params.job) ?? parseServiceJob(params.service) ?? "laundry";
  const itemLabel = typeof params.itemLabel === "string" ? params.itemLabel : undefined;
  const partnerId = typeof params.partnerId === "string" ? params.partnerId : undefined;
  const partnerName = typeof params.partnerName === "string" ? params.partnerName : null;

  useEffect(() => {
    if (partnerId && draft.partnerId !== partnerId) {
      setPartner(partnerId, partnerName);
    }
  }, [draft.partnerId, partnerId, partnerName, setPartner]);

  return (
    <View style={styles.container}>
      <ServiceBookingView
        key={`${job}-${itemLabel ?? ""}-${partnerId ?? draft.partnerId ?? ""}`}
        job={job}
        itemLabel={itemLabel}
        prefersPickupDelivery={params.mode === "pickupDelivery"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
});
