import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchCustomerOrderDetail,
  type CustomerOrderDetailData,
  type CustomerOrderDisplayStatus,
} from "@/lib/customer-orders";

const c = theme.colors;
const fs = theme.fontSize;
const PAD = 24;
const CARD_RADIUS = 18;

function statusLabel(status: CustomerOrderDisplayStatus): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  if (status === "completed") return "Completed";
  return "Rejected";
}

function statusColor(status: CustomerOrderDisplayStatus): string {
  if (status === "rejected") return "#D9534F";
  if (status === "accepted") return c.outline;
  if (status === "completed") return "#86efac";
  return c.white;
}

export default function CustomerOrderDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrderDetailData | null>(null);

  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !orderId) {
      setLoading(false);
      setOrder(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCustomerOrderDetail(user.id, orderId)
      .then((detail) => {
        if (cancelled) return;
        setOrder(detail);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unable to load order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.id]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Order detail</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.white} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Order not found.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.topRow}>
              <Text style={styles.orderRef}>Order #{order.orderRef}</Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor: statusColor(order.displayStatus),
                    backgroundColor: order.displayStatus === "rejected" ? c.white : "transparent",
                  },
                ]}
              >
                <Text style={[styles.status, { color: statusColor(order.displayStatus) }]}>
                  {statusLabel(order.displayStatus)}
                </Text>
              </View>
            </View>
            <Text style={styles.partner}>{order.partnerName}</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Estimated total</Text>
                <Text style={styles.metricValue}>{order.estimatedTotalLabel}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Items</Text>
                <Text style={styles.metricValue}>{order.totalItems}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Services</Text>
                <Text style={styles.metricValue}>{order.serviceGroups.length}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Partner</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={c.outline} />
              <Text style={styles.sectionValue}>{order.partnerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={c.outline} />
              <Text style={styles.sectionValue}>{order.partnerPhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={c.outline} />
              <Text style={styles.sectionValue}>{order.partnerAddress}</Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(customer)/chat/[orderId]",
                  params: { orderId: order.id },
                })
              }
              style={({ pressed }) => [
                styles.chatButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={16} color={c.white} />
              <Text style={styles.chatButtonText}>Chat with partner</Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={c.outline} />
              <View style={styles.infoTextBlock}>
                <Text style={styles.sectionLabel}>Pickup</Text>
                <Text style={styles.sectionValue}>{order.pickupSchedule}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="package-variant-closed" size={18} color={c.outline} />
              <View style={styles.infoTextBlock}>
                <Text style={styles.sectionLabel}>Delivery</Text>
                <Text style={styles.sectionValue}>{order.deliverySchedule}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Services</Text>
            {order.serviceGroups.map((group) => (
              <View key={group.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceTitle}>{group.title}</Text>
                  <Text style={styles.servicePrice}>{group.estimatedPriceLabel}</Text>
                </View>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemLabel}>{item.name}</Text>
                      <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                      <Text style={styles.itemMeta}>Preferences: {item.preferences}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{item.estimatedPriceLabel}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order notes</Text>
            <Text style={styles.sectionValue}>{order.notes}</Text>
          </View>

          {order.displayStatus === "rejected" && order.rejectionReasonOption ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Rejection reason</Text>
              <Text style={styles.sectionValue}>
                {order.rejectionReasonDetails
                  ? `${order.rejectionReasonOption} - ${order.rejectionReasonDetails}`
                  : order.rejectionReasonOption}
              </Text>
            </View>
          ) : null}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeTop: {
    paddingHorizontal: PAD,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: c.white,
    fontSize: fs.titleMedium,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PAD,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderRef: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
  },
  status: {
    fontSize: fs.descText,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  partner: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "600",
    marginTop: 6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  metricLabel: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    marginBottom: 6,
  },
  metricValue: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: c.outline,
    backgroundColor: c.blue900,
    padding: 18,
  },
  sectionTitle: {
    color: c.white,
    fontSize: fs.smallTitle,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionLabel: {
    color: c.blue500,
    fontSize: fs.xxSmallText,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  sectionValue: {
    color: c.white,
    fontSize: fs.descText,
    lineHeight: 20,
  },
  chatButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.background,
  },
  chatButtonText: {
    color: c.white,
    fontSize: fs.descText,
    fontWeight: "600",
  },
  serviceCard: {
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  serviceTitle: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  servicePrice: {
    color: c.blue500,
    fontSize: fs.descText,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemLabel: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemMeta: {
    color: c.blue500,
    fontSize: fs.descText,
    lineHeight: 18,
  },
  itemPrice: {
    color: c.white,
    fontSize: fs.smallText,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAD,
  },
  errorText: {
    color: "#fecaca",
    textAlign: "center",
    fontSize: fs.smallText,
  },
  mutedText: {
    color: c.blue500,
    textAlign: "center",
    fontSize: fs.smallText,
  },
  pressed: {
    opacity: 0.8,
  },
  bottomSpace: {
    height: 12,
  },
});
