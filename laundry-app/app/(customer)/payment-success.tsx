import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";

const c = theme.colors;

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { resetDraft } = useCustomerOrderDraft();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const shortOrderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

  const goHome = () => {
    resetDraft();
    router.replace("/(customer)/(tabs)");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable onPress={goHome} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Success</Text>
        <View style={styles.headerRight} />
      </SafeAreaView>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="check-bold" size={42} color={c.white} />
        </View>
        <Text style={styles.title}>Your order is confirmed</Text>
        {shortOrderId ? (
          <Text style={styles.sub}>Reference: {shortOrderId}</Text>
        ) : null}
        <Pressable onPress={goHome} style={styles.doneBtn}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: c.white },
  headerRight: { width: 40 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: c.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: { color: c.white, fontSize: 24, fontWeight: "800" },
  sub: { marginTop: 8, color: "rgba(255,255,255,0.78)", fontSize: 15 },
  doneBtn: {
    marginTop: 28,
    backgroundColor: c.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  doneLabel: { color: c.white, fontSize: 16, fontWeight: "700" },
});
