import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";

const c = theme.colors;

// Placeholder line items; can be replaced with real order state/params later
const SERVICE_LINES = [
  { nameKey: "washAndFold" as const, qty: 3, price: 14 },
  { nameKey: "dryCleaning" as const, qty: 3, price: 13 },
  { nameKey: "tailoring" as const, qty: 3, price: 21 },
];
const ORDER_NUMBER_PLACEHOLDER = "xyz";
const ESTIMATED_TOTAL = SERVICE_LINES.reduce((sum, l) => sum + l.price, 0);

export default function OrderSummaryScreen() {
  const router = useRouter();
  const s = strings.customer.orderSummary;
  const sServices = strings.customer.pickupServices;

  const handleSubmitOrder = () => {
    // TODO: submit to API and navigate to success
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{s.title}</Text>
        <Pressable
          style={({ pressed }) => [styles.headerRight, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Options"
        >
          <Image source={assets.icons.menu_icon} style={styles.headerRightIcon} />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.serviceCard}>
          <Text style={styles.serviceTitle}>{s.service}</Text>
          <Text style={styles.orderNumber}>
            {s.orderNumber}: {ORDER_NUMBER_PLACEHOLDER}
          </Text>
          {SERVICE_LINES.map((line) => (
            <View key={line.nameKey} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{sServices[line.nameKey]}</Text>
              <Text style={styles.serviceQty}>{line.qty}x</Text>
              <Text style={styles.servicePrice}>$ {line.price}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.estimatedTotalLabel}>{s.estimatedTotal}</Text>
            <Text style={styles.estimatedTotalValue}>$ {ESTIMATED_TOTAL}</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSubmitOrder}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitLabel}>{s.submitOrder}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
  },
  headerRight: { padding: 8 },
  headerRightIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  serviceCard: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  serviceName: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
    flex: 1,
  },
  serviceQty: {
    fontSize: 16,
    color: c.white,
    marginHorizontal: 16,
  },
  servicePrice: {
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
    minWidth: 48,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginTop: 8,
  },
  estimatedTotalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
  estimatedTotalValue: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  submitBtn: {
    backgroundColor: c.backgroundLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
});
