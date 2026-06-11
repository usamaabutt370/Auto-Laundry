import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { LaundererDetailView } from "@/components/launderer-detail-view";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { theme } from "@/constants/theme";

const c = theme.colors;

export default function LaundererDetailScreen() {
  const router = useRouter();
  const { setPartner } = useCustomerOrderDraft();
  const params = useLocalSearchParams<{
    id: string | string[];
    name?: string;
    mode?: string;
  }>();
  const partnerId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!partnerId) {
    return (
      <View style={styles.container}>
        {/* LaundererDetailView handles the "not found" state if partnerId is missing, 
            but since it's required in the screen, we check here too. */}
      </View>
    );
  }

  const handleSelect = (id: string, name: string | null) => {
    setPartner(id, name);
    router.push({
      pathname: "/(customer)/pickup-services",
      params: { mode: params.mode === "pickupDelivery" ? "pickupDelivery" : "dropoff" },
    });
  };

  return (
    <LaundererDetailView
      partnerId={partnerId}
      initialName={params.name}
      onBack={() => router.back()}
      onSelect={handleSelect}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
});
