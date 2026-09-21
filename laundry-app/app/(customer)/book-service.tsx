import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { ServiceBookingView } from "@/components/service-booking-view";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { parseServiceJob } from "@/lib/service-jobs";

export default function BookServiceScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    job?: string;
    service?: string;
    itemLabel?: string;
    mode?: string;
    partnerId?: string;
    partnerName?: string;
  }>();
  const { draft, setPartner } = useCustomerOrderDraft();
  const job = parseServiceJob(params.job) ?? parseServiceJob(params.service) ?? "washAndFold";
  const itemLabel = typeof params.itemLabel === "string" ? params.itemLabel : undefined;
  const partnerId = typeof params.partnerId === "string" ? params.partnerId : undefined;
  const partnerName = typeof params.partnerName === "string" ? params.partnerName : null;
  const sheetHeight = Math.round(height * 0.9);

  useEffect(() => {
    if (partnerId && draft.partnerId !== partnerId) {
      setPartner(partnerId, partnerName);
    }
  }, [draft.partnerId, partnerId, partnerName, setPartner]);

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.dismiss}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.body}>
          <ServiceBookingView
            key={`${job}-${itemLabel ?? ""}-${partnerId ?? draft.partnerId ?? ""}`}
            job={job}
            itemLabel={itemLabel}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: "#F7F8FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  body: { flex: 1 },
});
