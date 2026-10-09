import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { AppCtaButton } from "@/components/ui/cta-button";
import { OrderCelebration } from "@/components/ui/order-celebration";
import { gradients, UI } from "@/constants/theme";
import type { CustomerOrderListItem } from "@/lib/customer-orders";
import { imageForServiceItem } from "@/lib/service-item-images";

export type OrderCompletedStrings = {
  title: string;
  message: string;
  orderRef: string;
  itemsCount: string;
  itemsCountOne: string;
  reviewsCount: string;
  noReviews: string;
  total: string;
  leaveReview: string;
  viewDetails: string;
  pager: string;
  close: string;
  previous: string;
  next: string;
};

type Props = {
  orders: CustomerOrderListItem[];
  /** Orders that still have no review; others hide "Leave a Review". */
  reviewableOrderIds: Set<string>;
  strings: OrderCompletedStrings;
  onClose: () => void;
  onLeaveReview: (order: CustomerOrderListItem) => void;
  onViewDetails: (order: CustomerOrderListItem) => void;
  onViewProvider: (order: CustomerOrderListItem) => void;
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function formatCompletedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SuccessBadge() {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    scale.value = withSequence(
      withTiming(1.12, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 10, stiffness: 160 }),
    );
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.badgeRing, animStyle]}>
      <LinearGradient
        colors={[gradients.cta[0], gradients.cta[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <MaterialCommunityIcons name="check" size={44} color="#FFFFFF" />
      </LinearGradient>
    </Animated.View>
  );
}

export function OrderCompletedCelebration({
  orders,
  reviewableOrderIds,
  strings: s,
  onClose,
  onLeaveReview,
  onViewDetails,
  onViewProvider,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const order = orders[Math.min(index, orders.length - 1)];
  const total = orders.length;
  const canReview = order ? reviewableOrderIds.has(order.id) : false;

  useEffect(() => {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [index]);

  if (!order) return null;

  const itemCount = order.itemPreview.reduce((sum, item) => sum + item.quantity, 0);
  const firstItem = order.itemPreview[0];
  const serviceImage = imageForServiceItem(null, firstItem?.name ?? null, order.servicesSummary);
  const ratingLabel =
    order.partnerRatingAvg != null && order.partnerRatingCount > 0
      ? `${formatRating(order.partnerRatingAvg)} (${fill(s.reviewsCount, {
          count: order.partnerRatingCount,
        })})`
      : s.noReviews;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel={s.close}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={UI.text} />
          </Pressable>
          {total > 1 ? (
            <View style={styles.pager}>
              <Pressable
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={s.previous}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={18}
                  color={index === 0 ? UI.handle : UI.purple}
                />
              </Pressable>
              <Text style={styles.pagerText}>
                {fill(s.pager, { current: index + 1, total })}
              </Text>
              <Pressable
                onPress={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={s.next}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={index === total - 1 ? UI.handle : UI.purple}
                />
              </Pressable>
            </View>
          ) : null}
        </View>

        <ScrollView
          key={order.id}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.celebrationHost}>
              <OrderCelebration />
              <SuccessBadge />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.message}>{s.message}</Text>
          </View>

          <Pressable
            onPress={() => onViewProvider(order)}
            style={({ pressed }) => [styles.card, styles.providerCard, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            {order.partnerImageUrl ? (
              <Image
                source={{ uri: order.partnerImageUrl }}
                style={styles.providerImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.providerImage, styles.providerImageFallback]}>
                <MaterialCommunityIcons name="storefront-outline" size={28} color={UI.purple} />
              </View>
            )}
            <View style={styles.providerCopy}>
              <PartnerNameWithBadge
                name={order.partnerName}
                verified={order.partnerVerified}
                nameStyle={styles.providerName}
                badgeSize={16}
              />
              {order.partnerAddress ? (
                <Text style={styles.muted} numberOfLines={1}>
                  {order.partnerAddress}
                </Text>
              ) : null}
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={16} color={UI.star} />
                <Text style={styles.ratingText}>{ratingLabel}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={UI.muted} />
          </Pressable>

          <View style={styles.card}>
            <View style={styles.orderHead}>
              <View style={styles.iconWell}>
                <MaterialCommunityIcons name="calendar-month-outline" size={22} color={UI.purple} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.orderRef}>{fill(s.orderRef, { ref: order.orderRef })}</Text>
                <Text style={styles.muted}>{formatCompletedAt(order.updatedAt)}</Text>
              </View>
            </View>
            <View style={styles.serviceRow}>
              <Image source={serviceImage} style={styles.serviceImage} contentFit="cover" />
              <Text style={styles.serviceText} numberOfLines={2}>
                {order.servicesSummary}
                {itemCount > 0
                  ? `  •  ${
                      itemCount === 1
                        ? s.itemsCountOne
                        : fill(s.itemsCount, { count: itemCount })
                    }`
                  : ""}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{s.total}</Text>
              <Text style={styles.totalValue}>{order.estimatedTotalLabel}</Text>
            </View>
          </View>

          {total > 1 ? (
            <View style={styles.dots}>
              {orders.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => setIndex(i)}
                  hitSlop={6}
                  style={[styles.dot, i === index && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {canReview ? (
            <AppCtaButton label={s.leaveReview} onPress={() => onLeaveReview(order)} />
          ) : null}
          <Pressable
            onPress={() => onViewDetails(order)}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{s.viewDetails}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 44,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F0FF",
  },
  pagerText: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.purpleDeep },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  hero: { alignItems: "center", overflow: "visible" },
  celebrationHost: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  badgeRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: "Poppins-Bold",
    color: UI.purpleDeep,
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
    gap: 12,
  },
  providerCard: { flexDirection: "row", alignItems: "center" },
  providerImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: UI.iconWell },
  providerImageFallback: {
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  providerCopy: { flex: 1, minWidth: 0, gap: 3 },
  providerName: { fontSize: 16, fontFamily: "Poppins-Bold", color: UI.text },
  muted: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontFamily: "Poppins-Medium", color: UI.text },
  orderHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0 },
  orderRef: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.text },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  serviceImage: { width: 44, height: 44, borderRadius: 10, backgroundColor: UI.iconWell },
  serviceText: { flex: 1, fontSize: 14, fontFamily: "Poppins-Regular", color: UI.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: UI.chipBorder },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: UI.text },
  totalValue: { fontSize: 18, fontFamily: "Poppins-Bold", color: UI.text },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: UI.handle },
  dotActive: { width: 18, backgroundColor: UI.purple },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 13, fontFamily: "Poppins-SemiBold", color: UI.purpleDeep },
  pressed: { opacity: 0.85 },
});
