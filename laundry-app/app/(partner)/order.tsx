import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
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
import {
  DEMO_ORDERS,
  type DemoOrderStatus,
  type MonthKey,
} from "@/data/demo-orders";
import { useLocale } from "@/contexts/locale-context";
import { getStrings } from "@/locales";

const c = theme.colors;
const fs = theme.fontSize;
const H_PAD = 24;

const MONTH_KEYS: MonthKey[] = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function getMonthLabel(
  s: ReturnType<typeof getStrings>["partner"]["order"],
  key: MonthKey,
): string {
  const map: Record<MonthKey, string> = {
    january: s.monthJanuary,
    february: s.monthFebruary,
    march: s.monthMarch,
    april: s.monthApril,
    may: s.monthMay,
    june: s.monthJune,
    july: s.monthJuly,
    august: s.monthAugust,
    september: s.monthSeptember,
    october: s.monthOctober,
    november: s.monthNovember,
    december: s.monthDecember,
  };
  return map[key];
}

export default function PartnerOrderScreen() {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.order;

  const [filterOpen, setFilterOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [orderFilter, setOrderFilter] =
    useState<DemoOrderStatus>("orders");
  const [monthKey, setMonthKey] = useState<MonthKey>("april");
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

  /** Month dropdown opens just below the header month pill */
  const monthTriggerRef = useRef<View>(null);
  const [monthDropdownPos, setMonthDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const openMonthModal = useCallback(() => {
    const screenW = Dimensions.get("window").width;
    monthTriggerRef.current?.measureInWindow((x, y, w, h) => {
      setMonthDropdownPos({
        top: y + h + 6,
        right: screenW - x - w,
      });
      setMonthOpen(true);
    });
  }, []);

  const filterLabels: Record<DemoOrderStatus, string> = {
    orders: s.filterOrders,
    assigned: s.filterAssigned,
    completed: s.filterCompleted,
  };

  const sectionHeading =
    orderFilter === "orders"
      ? s.newOrdersHeading
      : orderFilter === "assigned"
        ? s.assignedHeading
        : s.completedHeading;

  const filteredOrders = useMemo(() => {
    return DEMO_ORDERS.filter(
      (o) => o.status === orderFilter && o.monthKey === monthKey,
    );
  }, [orderFilter, monthKey]);

  const handleSelectFilter = useCallback((filter: DemoOrderStatus) => {
    setOrderFilter(filter);
    setFilterOpen(false);
  }, []);

  const handleSelectMonth = useCallback((key: MonthKey) => {
    setMonthKey(key);
    setMonthOpen(false);
  }, []);

  const requestedPickupText = (date: string, time: string) =>
    s.requestedPickup.replace("{{date}}", date).replace("{{time}}", time);

  /** One filter in header top-right (month) – status stays below. */
  const headerRightMonthOnly = (
    <View ref={monthTriggerRef} collapsable={false}>
      <Pressable
        onPress={openMonthModal}
        style={({ pressed }) => [
          styles.headerFilterPill,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={s.monthLabel}
      >
        <Text style={styles.headerFilterText} numberOfLines={1}>
          {getMonthLabel(s, monthKey)}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={18}
          color={c.white}
        />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <PartnerHeader
          title={s.title}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          leftAccessibilityLabel={s.title}
          rightElement={headerRightMonthOnly}
        />
      </SafeAreaView>

      {/* Section heading left, filter button right, space between */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{s.emptyList}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              customerName={order.customerName}
              initial={order.initial}
              subtitle={requestedPickupText(order.date, order.time)}
              rightIcon={order.rightIcon ?? "none"}
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
            {(Object.keys(filterLabels) as DemoOrderStatus[]).map((key) => (
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

      {/* Month filter popup – positioned just below header month pill */}
      <Modal
        visible={monthOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMonthOpen(false)}
        >
          {monthDropdownPos != null && (
            <ScrollView
              style={[
                styles.monthScrollAnchored,
                {
                  position: "absolute",
                  top: monthDropdownPos.top,
                  right: monthDropdownPos.right,
                },
              ]}
              contentContainerStyle={styles.monthPopupContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.monthPopup} onStartShouldSetResponder={() => true}>
                {MONTH_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => handleSelectMonth(key)}
                    style={({ pressed }) => [
                      styles.filterOption,
                      monthKey === key && styles.filterOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.filterOptionText}>
                      {getMonthLabel(s, key)}
                    </Text>
                    {monthKey === key && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={c.outline}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
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
  /** Single pill – month only in header top-right */
  headerFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: c.blue900,
    borderWidth: 1,
    borderColor: c.outline,
  },
  headerFilterText: {
    fontSize: fs.smallText,
    fontWeight: "500",
    color: c.white,
  },
  pressed: { opacity: 0.85 },
  /** Heading left, filter right, space-between */
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
  /** No background shadow – transparent so dropdowns only show. */
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  /** Dropdown under filter button – top/right set from measureInWindow */
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
  /** Month list below header pill – absolute top/right from measureInWindow */
  monthScrollAnchored: {
    maxHeight: 320,
    minWidth: 180,
  },
  monthPopupContent: {
    borderRadius: 20,
    overflow: "hidden",
  },
  monthPopup: {
    backgroundColor: c.blue900,
    borderRadius: 20,
    minWidth: 180,
    borderWidth: 1,
    borderColor: c.modalBorder,
    overflow: "hidden",
  },
});
