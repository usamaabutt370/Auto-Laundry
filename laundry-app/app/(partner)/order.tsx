import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OrderCard } from "@/components/order-card";
import { PartnerHeader } from "@/components/partner-header";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { partnerUpdateOrderStatus } from "@/lib/partner-order-status";
import { fetchPartnerOrders, type PartnerOrderListItem } from "@/lib/partner-orders";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;

type OrderFilter = "pending" | "accepted" | "completed" | "rejected";

export default function PartnerOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.order;

  const initialFilter =
    params.filter === "accepted" ||
    params.filter === "completed" ||
    params.filter === "rejected" ||
    params.filter === "pending"
      ? params.filter
      : "pending";
  const [orderFilter, setOrderFilter] = useState<OrderFilter>(initialFilter);
  const [orders, setOrders] = useState<PartnerOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const filterLabels: Record<OrderFilter, string> = {
    pending: "Pending",
    accepted: "Accepted",
    completed: "Completed",
    rejected: "Rejected",
  };

  const loadOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const data = await fetchPartnerOrders();
      setOrders(data);
    } catch (error) {
      Alert.alert(
        "Unable to load orders",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrderFilter(initialFilter);
  }, [initialFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders(true);
    }, [loadOrders]),
  );

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadOrders(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOrders]);

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === "pending") {
      return order.rawStatus === "submitted";
    }
    if (orderFilter === "accepted") {
      return (
        order.rawStatus === "accepted" ||
        order.rawStatus === "in_progress" ||
        order.rawStatus === "ready"
      );
    }
    if (orderFilter === "completed") {
      return order.rawStatus === "completed";
    }
    // rejected
    return order.rawStatus === "rejected" || order.rawStatus === "cancelled";
  });

  const handleOrderAction = useCallback(
    async (orderId: string, status: "accepted" | "rejected") => {
      try {
        setActionOrderId(orderId);
        const result = await partnerUpdateOrderStatus(orderId, status);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: status === "rejected" ? "rejected" : "accepted",
                  rawStatus: result.status,
                }
              : order,
          ),
        );
      } catch (error) {
        Alert.alert(
          `Unable to ${status === "accepted" ? "accept" : "reject"} order`,
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setActionOrderId(null);
      }
    },
    [],
  );

  const handleCompleteOrder = useCallback(async (orderId: string) => {
    try {
      setActionOrderId(orderId);
      const result = await partnerUpdateOrderStatus(orderId, "completed");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "completed",
                rawStatus: result.status,
              }
            : order,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Unable to complete order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionOrderId(null);
    }
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={s.title}
        />
      </SafeAreaView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {(Object.keys(filterLabels) as OrderFilter[]).map((key) => {
          const selected = orderFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setOrderFilter(key)}
              style={({ pressed }) => [
                styles.filterChip,
                selected && styles.filterChipSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${filterLabels[key]} orders`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selected && styles.filterChipTextSelected,
                ]}
                numberOfLines={1}
              >
                {filterLabels[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor={c.blue900}
            progressViewOffset={8}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator color={c.white} />
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const detailRows = [
              { label: s.cardEstTotal, value: order.estimatedTotalLabel },
              ...(order.servicesSummary
                ? [{ label: s.cardServices, value: order.servicesSummary }]
                : []),
              ...(order.addressPreview
                ? [{ label: s.cardAddress, value: order.addressPreview }]
                : []),
            ];
            const canComplete =
              order.rawStatus === "accepted" ||
              order.rawStatus === "in_progress" ||
              order.rawStatus === "ready";

            return (
              <OrderCard
                key={order.id}
                customerName={order.customerName}
                initial={order.initial}
                subtitle={order.subtitle}
                rightIcon={order.rightIcon ?? "none"}
                statusLabel={order.status}
                detailRows={detailRows}
                onAccept={
                  order.status === "pending"
                    ? () => handleOrderAction(order.id, "accepted")
                    : undefined
                }
                onReject={
                  order.status === "pending"
                    ? () => handleOrderAction(order.id, "rejected")
                    : undefined
                }
                onComplete={
                  canComplete ? () => handleCompleteOrder(order.id) : undefined
                }
                completeLabel={s.completeOrder}
                actionsDisabled={actionOrderId === order.id}
                onPress={() =>
                  router.push({
                    pathname: "/(partner)/order-detail",
                    params: { orderId: order.id },
                  })
                }
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    paddingBottom: 8,
  },
  pressed: { opacity: 0.85 },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
    maxHeight: 44,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: H_PAD,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(171, 233, 254, 0.45)",
    backgroundColor: "transparent",
  },
  filterChipSelected: {
    backgroundColor: c.blue900,
    borderColor: c.outline,
  },
  filterChipText: {
    fontSize: fs.descText,
    fontWeight: "500",
    color: c.blue500,
  },
  filterChipTextSelected: {
    color: c.white,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 40,
    gap: 12,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
  },
});
