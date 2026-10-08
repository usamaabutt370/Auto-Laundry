import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { BlockingLoader } from "@/components/blocking-loader";
import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  DashboardPeriodSelector,
  type DashboardPeriod,
} from "@/components/dashboard-period-selector";
import {
  alertIfInsufficientCreditsError,
  ensurePartnerCreditsForAccept,
} from "@/components/partner-insufficient-credits-alert";
import { PartnerOrderSuccessModal, type PartnerOrderSuccessPayload } from "@/components/partner-order-success-modal";
import { PartnerRiderPickerModal } from "@/components/partner-rider-picker-modal";
import { WebHeaderSpacer } from "@/components/web-header-spacer";
import { theme, UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import {
  derivePartnerHomeView,
  fetchPartnerHomeSnapshot,
  type HomeServiceKey,
  type PartnerHomeOrder,
  type PartnerHomeSnapshot,
  type PartnerHomeView,
} from "@/lib/partner-home-dashboard";
import { acceptOrderWithRider, partnerOrderNeedsRider } from "@/lib/order-rider-assignment";
import { partnerUpdateOrderStatus } from "@/lib/partner-order-status";
import { fetchPartnerRiders, type PartnerRider } from "@/lib/partner-riders";
import { imageForServiceItem } from "@/lib/service-item-images";
import { getStrings } from "@/locales";

const fs = theme.fontSize;
const H_PAD = 16;

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const SERVICE_COLORS: Record<HomeServiceKey, { color: string; tint: string; icon: IconName }> = {
  washAndFold: { color: "#3B82F6", tint: "#EFF6FF", icon: "washing-machine" },
  press: { color: "#22C55E", tint: "#ECFDF3", icon: "iron" },
  dryCleaning: { color: "#F59E0B", tint: "#FFF7ED", icon: "hanger" },
  tailoring: { color: "#8B5CF6", tint: "#F5F3FF", icon: "content-cut" },
};

const REJECTION_OPTIONS = [
  "Items not serviceable",
  "Capacity full for selected slot",
  "Pickup area not covered",
  "Pricing mismatch",
  "Other",
] as const;

type RejectionOption = (typeof REJECTION_OPTIONS)[number];

function formatMoney(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return `Rs ${formatted}`;
}

function greetingKey(hour: number): "goodMorning" | "goodAfternoon" | "goodEvening" {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

function formatAgo(
  iso: string,
  copy: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  },
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return copy.justNow;
  if (mins < 60) return copy.minutesAgo.replace("{{count}}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return copy.hoursAgo.replace("{{count}}", String(hours));
  return copy.daysAgo.replace("{{count}}", String(Math.floor(hours / 24)));
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, radius, startAngle);
  const end = polar(cx, cy, radius, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isAfterDay(day: Date, today: Date): boolean {
  return startOfLocalDay(day).getTime() > startOfLocalDay(today).getTime();
}

function monthCells(visible: Date): (Date | null)[] {
  const year = visible.getFullYear();
  const month = visible.getMonth();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function PerformanceDatePicker({
  visible,
  selected,
  localeTag,
  title,
  todayLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Date;
  localeTag: string;
  title: string;
  todayLabel: string;
  onSelect: (day: Date) => void;
  onClose: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = startOfLocalDay(new Date());
  const weekdayLabels = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const monday = new Date(2024, 0, 1 + index);
      return new Intl.DateTimeFormat(localeTag, { weekday: "narrow" }).format(monday);
    });
  }, [localeTag]);

  useEffect(() => {
    if (!visible) return;
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected, visible]);

  if (!visible) return null;

  const monthLabel = new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward = visibleMonth.getTime() < currentMonthStart.getTime();

  return (
    <View style={styles.modalOverlay} pointerEvents="auto" accessibilityViewIsModal>
      <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() =>
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            onPress={() => {
              if (!canGoForward) return;
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!canGoForward}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={canGoForward ? UI.text : "#D1D5DB"}
            />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {weekdayLabels.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {monthCells(visibleMonth).map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const disabled = isAfterDay(day, today);
            const isSelected = isSameLocalDay(day, selected);
            return (
              <Pressable
                key={day.toISOString()}
                disabled={disabled}
                onPress={() => onSelect(day)}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled }}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    isSelected && styles.dayTextSelected,
                    !isSelected && isSameLocalDay(day, today) && styles.dayTextToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => onSelect(today)}
          style={styles.todayBtn}
          accessibilityRole="button"
        >
          <Text style={styles.todayBtnText}>{todayLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ServiceDonut({
  segments,
}: {
  segments: { color: string; value: number }[];
}) {
  const size = 132;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const drawn = segments.filter((segment) => segment.value > 0);
  const total = drawn.reduce((sum, segment) => sum + segment.value, 0);
  const gap = drawn.length > 1 ? 8 : 0;

  let angle = 0;
  const paths = drawn.map((segment) => {
    const sweep = total > 0 ? (segment.value / total) * 360 : 0;
    const start = angle + gap / 2;
    const end = angle + sweep - gap / 2;
    angle += sweep;
    if (sweep >= 359.5) {
      return { color: segment.color, full: true as const, d: "" };
    }
    return {
      color: segment.color,
      full: false as const,
      d: arcPath(center, center, radius, start, Math.max(start + 1, end)),
    };
  });

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="#EEF2F6"
        strokeWidth={stroke}
        fill="none"
      />
      {paths.map((path, index) =>
        path.full ? (
          <Circle
            key={index}
            cx={center}
            cy={center}
            r={radius}
            stroke={path.color}
            strokeWidth={stroke}
            fill="none"
          />
        ) : (
          <Path
            key={index}
            d={path.d}
            stroke={path.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        ),
      )}
    </Svg>
  );
}

export function PartnerHomeDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getStrings(locale).partner.dashboard.home;
  const orderCopy = getStrings(locale).partner.order;
  const commonCopy = getStrings(locale).common;
  const profileCopy = getStrings(locale).partner.profileScreen;
  const insufficientCreditsCopy = useMemo(
    () => ({
      title: orderCopy.insufficientCreditsTitle,
      message: orderCopy.insufficientCreditsMessage,
      recharge: orderCopy.insufficientCreditsRecharge,
      cancel: orderCopy.insufficientCreditsCancel,
      whatsappError: profileCopy.whatsappError,
    }),
    [
      orderCopy.insufficientCreditsCancel,
      orderCopy.insufficientCreditsMessage,
      orderCopy.insufficientCreditsRecharge,
      orderCopy.insufficientCreditsTitle,
      profileCopy.whatsappError,
    ],
  );
  const insets = useSafeAreaInsets();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8));
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();

  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [performanceDate, setPerformanceDate] = useState(() => startOfLocalDay(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<PartnerHomeSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [pendingAcceptOrderId, setPendingAcceptOrderId] = useState<string | null>(null);
  const [partnerRiders, setPartnerRiders] = useState<PartnerRider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<PartnerOrderSuccessPayload | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [pendingRejectOrderId, setPendingRejectOrderId] = useState<string | null>(null);
  const [selectedRejectionOption, setSelectedRejectionOption] = useState<RejectionOption | null>(null);
  const [otherRejectionReason, setOtherRejectionReason] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) {
      setSnapshot(null);
      setIsLoading(false);
      return;
    }
    try {
      const next = await fetchPartnerHomeSnapshot(user.id, copy.customerFallback);
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.customerFallback, copy.loadError, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const view: PartnerHomeView | null = useMemo(() => {
    if (!snapshot) return null;
    return derivePartnerHomeView(snapshot, period, new Date(), performanceDate);
  }, [performanceDate, period, snapshot]);

  const serviceLabel = useCallback(
    (key: HomeServiceKey | null, extra: number) => {
      const base =
        key === "washAndFold"
          ? copy.washFold
          : key === "press"
            ? copy.ironing
            : key === "dryCleaning"
              ? copy.dryCleaning
              : key === "tailoring"
                ? copy.tailoring
                : copy.dropoffLabel;
      return extra > 0 ? `${base} +${extra}` : base;
    },
    [copy.dropoffLabel, copy.dryCleaning, copy.ironing, copy.tailoring, copy.washFold],
  );

  const openOrder = useCallback(
    (orderId: string) => {
      router.push({
        pathname: "/(partner)/order-detail",
        params: { orderId },
      });
    },
    [router],
  );

  const openOrders = useCallback(
    (filter: "pending" | "accepted" | "completed") => {
      router.navigate({
        pathname: "/(partner)/(tabs)/order",
        params: { filter },
      });
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const applyLocalStatus = useCallback((orderId: string, status: PartnerHomeOrder["rawStatus"]) => {
    setSnapshot((current) => {
      if (!current) return current;
      return {
        ...current,
        orders: current.orders.map((order) =>
          order.id === orderId ? { ...order, rawStatus: status } : order,
        ),
      };
    });
  }, []);

  const handleOrderAction = useCallback(
    async (
      orderId: string,
      status: "accepted" | "rejected",
      rejection?: { option: string; details?: string },
    ) => {
      try {
        setActionOrderId(orderId);
        const result = await partnerUpdateOrderStatus(orderId, status, rejection);
        applyLocalStatus(orderId, result.status);
        setActionOrderId(null);
        if (status === "accepted") {
          setSuccessPayload({ type: "accepted" });
        } else {
          showAppAlert("Order rejected", "The order has been rejected.");
        }
      } catch (err) {
        setActionOrderId(null);
        if (
          status === "accepted" &&
          alertIfInsufficientCreditsError(err, {
            copy: insufficientCreditsCopy,
            partnerName: view?.businessName || copy.businessFallback,
          })
        ) {
          return;
        }
        showAppAlert(
          `Unable to ${status === "accepted" ? "accept" : "reject"} order`,
          err instanceof Error ? err.message : "Please try again.",
        );
      }
    },
    [applyLocalStatus, copy.businessFallback, insufficientCreditsCopy, view?.businessName],
  );

  const openAcceptFlow = useCallback(
    async (order: PartnerHomeOrder) => {
      const partnerName = view?.businessName || copy.businessFallback;
      try {
        const allowed = await ensurePartnerCreditsForAccept({
          orderAmount: order.amount,
          partnerName,
          copy: insufficientCreditsCopy,
        });
        if (!allowed) return;
      } catch (err) {
        showAppAlert(
          "Unable to accept order",
          err instanceof Error ? err.message : "Please try again.",
        );
        return;
      }

      if (!partnerOrderNeedsRider(order)) {
        void handleOrderAction(order.id, "accepted");
        return;
      }
      if (!user?.id) return;
      setPendingAcceptOrderId(order.id);
      setSelectedRiderId(null);
      setLoadingRiders(true);
      setRiderModalVisible(true);
      try {
        const riders = await fetchPartnerRiders(user.id);
        setPartnerRiders(riders);
        if (riders.length === 0) {
          setRiderModalVisible(false);
          setPendingAcceptOrderId(null);
          showAppAlert(orderCopy.noRidersTitle, orderCopy.noRidersMessage);
        }
      } catch (err) {
        setRiderModalVisible(false);
        setPendingAcceptOrderId(null);
        showAppAlert(
          "Unable to load riders",
          err instanceof Error ? err.message : "Please try again.",
        );
      } finally {
        setLoadingRiders(false);
      }
    },
    [
      copy.businessFallback,
      handleOrderAction,
      insufficientCreditsCopy,
      orderCopy.noRidersMessage,
      orderCopy.noRidersTitle,
      user?.id,
      view?.businessName,
    ],
  );

  const confirmRiderAccept = useCallback(async () => {
    if (!pendingAcceptOrderId || !user?.id) return;
    if (!selectedRiderId) {
      showAppAlert(orderCopy.selectRiderRequired);
      return;
    }
    try {
      setActionOrderId(pendingAcceptOrderId);
      await acceptOrderWithRider({
        orderId: pendingAcceptOrderId,
        partnerId: user.id,
        riderId: selectedRiderId,
      });
      applyLocalStatus(pendingAcceptOrderId, "accepted");
      setRiderModalVisible(false);
      setPendingAcceptOrderId(null);
      setSelectedRiderId(null);
      setActionOrderId(null);
      setSuccessPayload({ type: "accepted" });
    } catch (err) {
      setActionOrderId(null);
      if (
        alertIfInsufficientCreditsError(err, {
          copy: insufficientCreditsCopy,
          partnerName: view?.businessName || copy.businessFallback,
        })
      ) {
        return;
      }
      showAppAlert(
        "Unable to accept order",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }, [
    applyLocalStatus,
    copy.businessFallback,
    insufficientCreditsCopy,
    orderCopy.selectRiderRequired,
    pendingAcceptOrderId,
    selectedRiderId,
    user?.id,
    view?.businessName,
  ]);

  const openRejectModal = useCallback((orderId: string) => {
    setPendingRejectOrderId(orderId);
    setSelectedRejectionOption(null);
    setOtherRejectionReason("");
    setRejectModalVisible(true);
  }, []);

  const submitRejection = useCallback(() => {
    if (!pendingRejectOrderId) return;
    if (!selectedRejectionOption) {
      showAppAlert("Select rejection reason", "Please choose a reason before rejecting this order.");
      return;
    }
    const details = selectedRejectionOption === "Other" ? otherRejectionReason.trim() : "";
    if (selectedRejectionOption === "Other" && details.length === 0) {
      showAppAlert("Add details", "Please explain the rejection reason in the input box.");
      return;
    }
    const orderId = pendingRejectOrderId;
    setRejectModalVisible(false);
    setPendingRejectOrderId(null);
    void handleOrderAction(orderId, "rejected", {
      option: selectedRejectionOption,
      details,
    });
  }, [handleOrderAction, otherRejectionReason, pendingRejectOrderId, selectedRejectionOption]);

  const hour = new Date().getHours();
  const localeTag = locale === "ur" ? "ur-PK" : "en-GB";
  const isPerformanceToday = isSameLocalDay(performanceDate, new Date());
  const dateLabel = new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(performanceDate);

  const businessName = view?.businessName || copy.businessFallback;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={isWeb ? [] : ["top"]} style={styles.safe}>
        {isWeb ? <WebHeaderSpacer /> : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />
          }
        >
          <View style={styles.column}>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                {view?.photoUrl ? (
                  <Image source={{ uri: view.photoUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <MaterialCommunityIcons name="storefront-outline" size={22} color={UI.purple} />
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>{copy[greetingKey(hour)]}</Text>
                <Text style={styles.businessName} numberOfLines={1}>
                  {businessName}
                </Text>
                {view?.addressLine ? (
                  <Text style={styles.address} numberOfLines={1}>
                    {view.addressLine}
                  </Text>
                ) : null}
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => void load()} style={styles.retryBtn}>
                  <Text style={styles.retryText}>{copy.retry}</Text>
                </Pressable>
              </View>
            ) : null}

            {isLoading && !view ? (
              <Text style={styles.loadingText}>{copy.loading}</Text>
            ) : null}

            {view ? (
              <>
                <View style={styles.card}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>
                    {isPerformanceToday ? copy.todaysPerformance : copy.performance}
                  </Text>
                  <Pressable
                    onPress={() => setDatePickerOpen(true)}
                    style={({ pressed }) => [styles.dateChip, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={copy.chooseDay}
                  >
                    <Text style={styles.dateText}>{dateLabel}</Text>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={UI.muted} />
                  </Pressable>
                </View>

                <View style={styles.statGrid}>
                  <View style={styles.statRow}>
                    <StatCard
                      tint="#EEF4FF"
                      icon="clipboard-text-outline"
                      iconColor="#3B82F6"
                      value={String(view.newOrders)}
                      label={copy.newOrders}
                      onPress={() => openOrders("pending")}
                    />
                    <StatCard
                      tint="#FFF4EC"
                      icon="clock-outline"
                      iconColor="#F59E0B"
                      value={String(view.activeCount)}
                      label={copy.activeOrders}
                      onPress={() => openOrders("accepted")}
                    />
                  </View>
                  <View style={styles.statRow}>
                    <StatCard
                      tint="#ECFDF3"
                      icon="check-circle-outline"
                      iconColor="#16A34A"
                      value={String(view.completedToday)}
                      label={copy.completedOrders}
                      onPress={() => openOrders("completed")}
                    />
                    <StatCard
                      tint="#F5F3FF"
                      icon="wallet-outline"
                      iconColor="#7C3AED"
                      value={formatMoney(view.earningsToday)}
                      label={isPerformanceToday ? copy.todaysEarnings : copy.earnings}
                      onPress={() => router.push("/(partner)/earnings-history")}
                    />
                  </View>
                </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>{copy.ordersByService}</Text>
                    <DashboardPeriodSelector
                      value={period}
                      onValueChange={setPeriod}
                      labels={{
                        week: copy.periodThisWeek,
                        month: copy.periodThisMonth,
                        year: copy.periodThisYear,
                      }}
                      style={styles.periodTrigger}
                    />
                  </View>
                  {view.mixTotal === 0 ? (
                    <Text style={styles.emptyText}>{copy.noServiceOrders}</Text>
                  ) : (
                    <View style={styles.mixRow}>
                      <View style={styles.donutWrap}>
                        <ServiceDonut
                          segments={view.mix
                            .filter((row) => row.count > 0)
                            .map((row) => ({
                              color: SERVICE_COLORS[row.key].color,
                              value: row.count,
                            }))}
                        />
                        <View style={styles.donutCenter} pointerEvents="none">
                          <Text style={styles.donutTotal}>{view.mixTotal}</Text>
                          <Text style={styles.donutCaption}>{copy.totalOrders}</Text>
                        </View>
                      </View>
                      <View style={styles.legend}>
                        {view.mix.map((row) => {
                          const meta = SERVICE_COLORS[row.key];
                          const name =
                            row.key === "washAndFold"
                              ? copy.washFold
                              : row.key === "press"
                                ? copy.ironing
                                : row.key === "dryCleaning"
                                  ? copy.dryCleaning
                                  : copy.tailoring;
                          const countLabel =
                            row.count === 1
                              ? copy.orderCountOne
                              : copy.orderCount.replace("{{count}}", String(row.count));
                          return (
                            <View key={row.key} style={styles.legendRow}>
                              <View style={[styles.legendIcon, { backgroundColor: meta.tint }]}>
                                <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                              </View>
                              <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                              <Text style={styles.legendName} numberOfLines={1}>
                                {name}
                              </Text>
                              <Text style={styles.legendCount}>{countLabel}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.card}>
                  <View style={styles.sectionHead}>
                    <View style={styles.titleWithBadge}>
                      <Text style={styles.sectionTitle}>{copy.ordersRequiringAction}</Text>
                      {view.actionCount > 0 ? (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{view.actionCount}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable onPress={() => openOrders("pending")} hitSlop={8}>
                      <Text style={styles.viewAll}>
                        {copy.viewAll} <Text style={styles.viewAllChevron}>›</Text>
                      </Text>
                    </Pressable>
                  </View>
                  {view.actionOrders.length === 0 ? (
                    <Text style={styles.emptyText}>{copy.noActionOrders}</Text>
                  ) : (
                    view.actionOrders.map((order) => (
                      <ActionOrderCard
                        key={order.id}
                        order={order}
                        copy={copy}
                        serviceLabel={serviceLabel(order.serviceKey, order.extraServiceCount)}
                        ago={formatAgo(order.timelineIso, copy)}
                        onOpen={() => openOrder(order.id)}
                        onDecline={() => openRejectModal(order.id)}
                        onAccept={() => void openAcceptFlow(order)}
                      />
                    ))
                  )}
                </View>

                <View style={styles.card}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>{copy.activeOrdersSection}</Text>
                    <Pressable onPress={() => openOrders("accepted")} hitSlop={8}>
                      <Text style={styles.viewAll}>
                        {copy.viewAll} <Text style={styles.viewAllChevron}>›</Text>
                      </Text>
                    </Pressable>
                  </View>
                  {view.activeOrders.length === 0 ? (
                    <Text style={styles.emptyText}>{copy.noActiveOrders}</Text>
                  ) : (
                    view.activeOrders.map((order) => (
                      <ActiveOrderCard
                        key={order.id}
                        order={order}
                        copy={copy}
                        serviceLabel={serviceLabel(order.serviceKey, order.extraServiceCount)}
                        onOpen={() => openOrder(order.id)}
                      />
                    ))
                  )}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      <PartnerOrderSuccessModal payload={successPayload} onClose={() => setSuccessPayload(null)} />
      <PartnerRiderPickerModal
        visible={riderModalVisible}
        riders={partnerRiders}
        loading={loadingRiders}
        selectedRiderId={selectedRiderId}
        title={orderCopy.selectRiderTitle}
        subtitle={orderCopy.selectRiderSubtitle}
        confirmLabel={orderCopy.selectRiderConfirm}
        cancelLabel={orderCopy.selectRiderCancel}
        loadingLabel={orderCopy.loadingRiders}
        emptyLabel={orderCopy.noRidersMessage}
        onSelectRider={setSelectedRiderId}
        onConfirm={() => void confirmRiderAccept()}
        confirming={actionOrderId === pendingAcceptOrderId && pendingAcceptOrderId !== null}
        confirmingLabel={commonCopy.acceptingOrder}
        onClose={() => {
          if (actionOrderId === pendingAcceptOrderId) return;
          setRiderModalVisible(false);
          setPendingAcceptOrderId(null);
          setSelectedRiderId(null);
        }}
      />
      <BlockingLoader
        visible={actionOrderId !== null && !riderModalVisible}
        message={commonCopy.acceptingOrder}
      />
      <PerformanceDatePicker
        visible={datePickerOpen}
        selected={performanceDate}
        localeTag={localeTag}
        title={copy.chooseDay}
        todayLabel={copy.today}
        onSelect={(day) => {
          setPerformanceDate(startOfLocalDay(day));
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
      />
      {rejectModalVisible ? (
        <View style={styles.modalOverlay} pointerEvents="auto" accessibilityViewIsModal>
          <Pressable style={styles.modalBackdrop} onPress={() => setRejectModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject order</Text>
            <Text style={styles.modalSubtitle}>Select a reason to notify the customer.</Text>
            <View style={styles.reasonList}>
              {REJECTION_OPTIONS.map((option) => {
                const selected = selectedRejectionOption === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedRejectionOption(option)}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                  >
                    <Text style={[styles.reasonOptionText, selected && styles.reasonOptionTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedRejectionOption === "Other" ? (
              <TextInput
                multiline
                value={otherRejectionReason}
                onChangeText={setOtherRejectionReason}
                placeholder="Write reason for rejection"
                placeholderTextColor={UI.muted}
                style={styles.otherReasonInput}
                textAlignVertical="top"
              />
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRejectModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitRejection} style={styles.modalRejectBtn}>
                <Text style={styles.modalRejectText}>Reject order</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  tint,
  icon,
  iconColor,
  value,
  label,
  onPress,
}: {
  tint: string;
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statCard, { backgroundColor: tint }, pressed && styles.pressed]}
    >
      <View style={styles.statIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#C5CDD8" style={styles.statChevron} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionOrderCard({
  order,
  copy,
  serviceLabel,
  ago,
  onOpen,
  onDecline,
  onAccept,
}: {
  order: PartnerHomeOrder;
  copy: ReturnType<typeof getStrings>["partner"]["dashboard"]["home"];
  serviceLabel: string;
  ago: string;
  onOpen: () => void;
  onDecline: () => void;
  onAccept: () => void;
}) {
  const itemLabel =
    order.itemCount === 1
      ? copy.itemCountOne
      : copy.itemCount.replace("{{count}}", String(order.itemCount));
  const schedule = order.pickupWhen
    ? copy.pickupPrefix.replace("{{when}}", order.pickupWhen)
    : order.deliveryWhen
      ? copy.deliveryPrefix.replace("{{when}}", order.deliveryWhen)
      : copy.dropoffLabel;

  return (
    <View style={styles.orderCard}>
      <Pressable onPress={onOpen} style={styles.orderMain}>
        <View style={styles.thumb}>
          <Image
            source={imageForServiceItem(undefined, undefined, order.serviceKey)}
            style={styles.thumbImage}
            contentFit="cover"
          />
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{copy.badgeNew}</Text>
          </View>
        </View>
        <View style={styles.orderBody}>
          <View style={styles.orderTop}>
            <Text style={styles.orderRef} numberOfLines={1}>
              {order.orderRef} <Text style={styles.orderAgo}>· {ago}</Text>
            </Text>
            <Text style={styles.orderPrice}>{formatMoney(order.amount)}</Text>
          </View>
          <Text style={styles.orderService} numberOfLines={1}>
            {serviceLabel} <Text style={styles.orderMuted}>· {itemLabel}</Text>
          </Text>
          <View style={styles.metaLine}>
            <MaterialCommunityIcons name="account-outline" size={14} color={UI.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={UI.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {schedule}
            </Text>
          </View>
          {order.address ? (
            <View style={styles.metaLine}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {order.address}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable onPress={onDecline} style={({ pressed }) => [styles.declineBtn, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="close" size={14} color="#E11D48" />
          <Text style={styles.declineText}>{copy.decline}</Text>
        </Pressable>
        <Pressable onPress={onAccept} style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
          <Text style={styles.acceptText}>{copy.accept}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActiveOrderCard({
  order,
  copy,
  serviceLabel,
  onOpen,
}: {
  order: PartnerHomeOrder;
  copy: ReturnType<typeof getStrings>["partner"]["dashboard"]["home"];
  serviceLabel: string;
  onOpen: () => void;
}) {
  const itemLabel =
    order.itemCount === 1
      ? copy.itemCountOne
      : copy.itemCount.replace("{{count}}", String(order.itemCount));
  const statusLabel = order.rawStatus === "ready" ? copy.statusReady : copy.statusInProgress;
  const scheduleParts = [
    order.pickupWhen ? copy.pickupPrefix.replace("{{when}}", order.pickupWhen) : null,
    order.deliveryWhen ? copy.deliveryPrefix.replace("{{when}}", order.deliveryWhen) : null,
  ].filter(Boolean);

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}>
      <View style={styles.orderMain}>
        <View style={styles.thumb}>
          <Image
            source={imageForServiceItem(undefined, undefined, order.serviceKey)}
            style={styles.thumbImage}
            contentFit="cover"
          />
        </View>
        <View style={styles.orderBody}>
          <View style={styles.orderTop}>
            <Text style={styles.orderRef} numberOfLines={1}>
              {order.orderRef}
            </Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>{statusLabel}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.orderService} numberOfLines={1}>
            {serviceLabel} <Text style={styles.orderMuted}>· {itemLabel}</Text>
          </Text>
          {scheduleParts.length > 0 ? (
            <View style={styles.metaLine}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={UI.muted} />
              <Text style={styles.metaText} numberOfLines={2}>
                {scheduleParts.join("  ·  ")}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FB" },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: H_PAD, paddingTop: 8 },
  column: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  headerText: { flex: 1, minWidth: 0 },
  greeting: { fontSize: fs.descText, color: UI.muted },
  businessName: { fontSize: fs.smallTitle, fontWeight: "700", color: "#1E3A8A" },
  address: { fontSize: fs.xxSmallText, color: UI.muted, marginTop: 1 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: fs.smallText, fontWeight: "700", color: UI.text, flexShrink: 1 },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dateText: { fontSize: fs.xxSmallText, color: UI.muted, fontWeight: "600" },
  statGrid: { gap: 10 },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    minHeight: 108,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  statChevron: { position: "absolute", top: 14, right: 8 },
  statValue: { marginTop: 10, fontSize: 22, fontWeight: "700", color: UI.text },
  statLabel: { marginTop: 2, fontSize: fs.xxSmallText, color: UI.muted, fontWeight: "600" },
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  periodTrigger: {
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 0,
  },
  mixRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  donutWrap: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center", width: 72 },
  donutTotal: { fontSize: 26, fontWeight: "800", color: UI.text },
  donutCaption: { fontSize: 10, color: UI.muted, fontWeight: "600", textAlign: "center" },
  legend: { flex: 1, gap: 10, minWidth: 0 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendName: { flex: 1, fontSize: 12, fontWeight: "600", color: UI.text },
  legendCount: { fontSize: 11, color: UI.muted, textAlign: "right" },
  titleWithBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#F43F5E",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  viewAll: { color: "#2563EB", fontSize: fs.descText, fontWeight: "600" },
  viewAllChevron: { fontSize: 16 },
  emptyText: { color: UI.muted, fontSize: fs.descText, paddingVertical: 8 },
  orderCard: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 4,
    gap: 10,
  },
  orderMain: { flexDirection: "row", gap: 10 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  thumbImage: {
    width: 64,
    height: 64,
  },
  newBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  orderBody: { flex: 1, minWidth: 0, gap: 2 },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  orderRef: { flex: 1, fontSize: 13, fontWeight: "700", color: UI.text },
  orderAgo: { fontWeight: "500", color: UI.muted },
  orderPrice: { fontSize: 14, fontWeight: "700", color: UI.text },
  orderService: { fontSize: 13, fontWeight: "600", color: "#1E3A8A" },
  orderMuted: { color: UI.muted, fontWeight: "500" },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { flex: 1, fontSize: 12, color: UI.muted },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  declineText: { color: "#E11D48", fontWeight: "700", fontSize: 13 },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
  },
  progressText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.86 },
  loadingText: { color: UI.muted, textAlign: "center", paddingVertical: 24 },
  errorCard: {
    backgroundColor: UI.card,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: UI.red, fontSize: fs.descText },
  retryBtn: { alignSelf: "flex-start" },
  retryText: { color: "#2563EB", fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17, 24, 39, 0.45)" },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 16,
    zIndex: 1,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  monthLabel: { fontSize: fs.smallText, fontWeight: "700", color: UI.text },
  weekRow: { flexDirection: "row" },
  weekday: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: UI.muted,
    paddingVertical: 6,
  },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  dayCellSelected: { backgroundColor: "#2563EB" },
  dayText: { fontSize: 14, fontWeight: "600", color: UI.text },
  dayTextDisabled: { color: "#D1D5DB" },
  dayTextSelected: { color: "#FFFFFF" },
  dayTextToday: { color: "#2563EB" },
  todayBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 8, paddingHorizontal: 4 },
  todayBtnText: { color: "#2563EB", fontWeight: "700", fontSize: fs.descText },
  modalTitle: { fontSize: fs.smallTitle, fontWeight: "700", color: UI.text },
  modalSubtitle: { color: UI.muted, marginTop: 4, marginBottom: 12, fontSize: fs.descText },
  reasonList: { gap: 8 },
  reasonOption: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasonOptionSelected: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  reasonOptionText: { color: UI.text, fontSize: fs.descText },
  reasonOptionTextSelected: { color: "#1D4ED8", fontWeight: "700" },
  otherReasonInput: {
    marginTop: 10,
    minHeight: 80,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    padding: 10,
    color: UI.text,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  modalCancelBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  modalCancelText: { color: UI.muted, fontWeight: "600" },
  modalRejectBtn: {
    backgroundColor: "#E11D48",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalRejectText: { color: "#FFFFFF", fontWeight: "700" },
});
