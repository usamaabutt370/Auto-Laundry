import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
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

  const [filterOpen, setFilterOpen] = useState(false);
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
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  /** Anchor for filter dropdown: opens just below the filter button */
  const filterTriggerRef = useRef<View>(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const openFilterModal = useCallback(() => {
    const screenW = Dimensions.get("window").width;
    filterTriggerRef.current?.measureInWindow((x, y, w, h) => {
      setFilterDropdownPos({
        top: y + h + 6,
        right: screenW - x - w,
      });
      setFilterOpen(true);
    });
  }, []);

  const filterLabels: Record<OrderFilter, string> = {
    pending: "Pending",
    accepted: "Accepted",
    completed: "Completed",
    rejected: "Rejected",
  };

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchPartnerOrders();
      setOrders(data);
    } catch (error) {
      Alert.alert(
        "Unable to load orders",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrderFilter(initialFilter);
  }, [initialFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

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

  const handleSelectFilter = useCallback((filter: OrderFilter) => {
    setOrderFilter(filter);
    setFilterOpen(false);
  }, []);

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

  const sectionHeading = filterLabels[orderFilter];

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

      <View style={styles.headingRow}>
        <Text style={styles.sectionHeading} numberOfLines={1}>
          {sectionHeading}
        </Text>
        <View ref={filterTriggerRef} collapsable={false}>
        <Pressable
          onPress={openFilterModal}
          style={({ pressed }) => [
            styles.filterTrigger,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={s.filterLabel}
        >
          <Text style={styles.filterTriggerText} numberOfLines={1}>
            {filterLabels[orderFilter]}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={c.white}
          />
        </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              customerName={order.customerName}
              initial={order.initial}
              subtitle={order.subtitle}
              rightIcon={order.rightIcon ?? "none"}
              statusLabel={order.status}
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
              actionsDisabled={actionOrderId === order.id}
              onPress={() =>
                router.push({
                  pathname: "/(partner)/order-detail",
                  params: { orderId: order.id },
                })
              }
            />
          ))
        )}
      </ScrollView>

      {/* Status filter popup – positioned just below filter button */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterOpen(false)}
        >
          {filterDropdownPos != null && (
            <View
              style={[
                styles.filterPopup,
                {
                  position: "absolute",
                  top: filterDropdownPos.top,
                  right: filterDropdownPos.right,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
            {(Object.keys(filterLabels) as OrderFilter[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => handleSelectFilter(key)}
                style={({ pressed }) => [
                  styles.filterOption,
                  orderFilter === key && styles.filterOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.filterOptionText}>
                  {filterLabels[key]}
                </Text>
                {orderFilter === key && (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={c.outline}
                  />
                )}
              </Pressable>
            ))}
            </View>
          )}
        </Pressable>
      </Modal>
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
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  filterTrigger: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.outline,
  },
  filterTriggerText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  sectionHeading: {
    flex: 1,
    marginRight: 12,
    fontSize: fs.titleMedium,
    fontWeight: "600",
    color: c.white,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  filterPopup: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    minWidth: 200,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: c.modalBorder,
    overflow: "hidden",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
  },
  filterOptionSelected: {
    backgroundColor: "rgba(59, 127, 149, 0.35)",
  },
  filterOptionText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
});
