import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBottomTabScreenOptions } from "@/components/bottom-tab-bar";
import { AppCtaButton } from "@/components/ui/cta-button";
import { OrderCelebration } from "@/components/ui/order-celebration";
import { gradients, UI } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { imageForServiceItem } from "@/lib/service-item-images";
import { getStrings } from "@/locales";

export type AcceptedOrderSummary = {
  id: string;
  orderRef: string;
  customerName: string;
  avatarUrl?: string | null;
  address: string;
  serviceLabel: string;
  itemCount: number;
  totalLabel: string;
  pickupWhen: string | null;
  deliveryWhen: string | null;
  riderName?: string | null;
};

export type PartnerOrderSuccessPayload =
  | { type: "accepted"; order?: AcceptedOrderSummary }
  | { type: "completed"; order?: AcceptedOrderSummary; charged: number; balance: number };

type Props = {
  payload: PartnerOrderSuccessPayload | null;
  onClose: () => void;
  onViewDetails?: (orderId: string) => void;
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={UI.purple} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Rendered as an in-screen overlay instead of RN Modal — avoids iOS touch freeze after accept. */
export function PartnerOrderSuccessModal({ payload, onClose, onViewDetails }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).partner.order.acceptedCelebration;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.9);
  const visible = payload !== null;

  useEffect(() => {
    if (visible && Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const baseTabBarStyle = getBottomTabScreenOptions(0).tabBarStyle;
    navigation.setOptions({ tabBarStyle: { ...baseTabBarStyle, display: "none" } });
    return () => navigation.setOptions({ tabBarStyle: baseTabBarStyle });
  }, [navigation, visible]);

  if (payload === null) return null;
  const order = payload.order;
  const isCompleted = payload.type === "completed";
  const title = isCompleted ? s.completedTitle : s.title;
  const message = order?.customerName
    ? fill(isCompleted ? s.completedMessage : s.message, { name: order.customerName })
    : isCompleted
      ? s.completedMessageFallback
      : s.messageFallback;
  const serviceImage = order
    ? imageForServiceItem(null, order.serviceLabel, order.serviceLabel)
    : null;
  const initial = order?.customerName.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={s.close}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
        style={[styles.sheet, { height: sheetHeight }]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.roundBtn}
            accessibilityRole="button"
            accessibilityLabel={s.close}
          >
            <MaterialCommunityIcons name="close" size={20} color={UI.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.celebrationHost}>
              <OrderCelebration />
              <SuccessBadge />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {order ? (
            <>
              <View style={[styles.card, styles.customerCard]}>
                {order.avatarUrl ? (
                  <Image
                    source={{ uri: order.avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.customerLabel}>{s.customer}</Text>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {order.customerName}
                  </Text>
                  {order.address ? (
                    <Text style={styles.muted} numberOfLines={1}>
                      {order.address}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.orderHead}>
                  <View style={styles.iconWell}>
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={22}
                      color={UI.purple}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.orderRef}>
                      {fill(s.orderRef, { ref: order.orderRef })}
                    </Text>
                    <Text style={styles.muted}>
                      {isCompleted ? s.completedJustNow : s.acceptedJustNow}
                    </Text>
                  </View>
                </View>
                <View style={styles.serviceRow}>
                  {serviceImage ? (
                    <Image source={serviceImage} style={styles.serviceImage} contentFit="cover" />
                  ) : null}
                  <Text style={styles.serviceText} numberOfLines={2}>
                    {order.serviceLabel}
                    {order.itemCount > 0
                      ? `  •  ${
                          order.itemCount === 1
                            ? s.itemsCountOne
                            : fill(s.itemsCount, { count: order.itemCount })
                        }`
                      : ""}
                  </Text>
                </View>
                {order.pickupWhen || order.deliveryWhen || order.riderName ? (
                  <View style={styles.infoBlock}>
                    {order.pickupWhen ? (
                      <InfoRow icon="truck-outline" label={s.pickup} value={order.pickupWhen} />
                    ) : null}
                    {order.deliveryWhen ? (
                      <InfoRow
                        icon="package-variant-closed"
                        label={s.delivery}
                        value={order.deliveryWhen}
                      />
                    ) : null}
                    {order.riderName ? (
                      <InfoRow icon="motorbike" label={s.rider} value={order.riderName} />
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{s.total}</Text>
                  <Text style={styles.totalValue}>{order.totalLabel}</Text>
                </View>
              </View>
            </>
          ) : null}

          {payload.type === "completed" ? (
            <View style={[styles.card, styles.creditsCard]}>
              <View style={styles.creditsRow}>
                <View style={styles.creditsIcon}>
                  <MaterialCommunityIcons name="wallet-outline" size={20} color={UI.purple} />
                </View>
                <Text style={styles.creditsLabel}>{s.creditsCharged}</Text>
                <Text style={styles.creditsValue}>
                  {fill(s.creditsValue, { count: payload.charged })}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.creditsRow}>
                <View style={styles.creditsIcon}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color={UI.purple} />
                </View>
                <Text style={styles.creditsLabel}>{s.remainingBalance}</Text>
                <Text style={[styles.creditsValue, styles.balanceValue]}>
                  {fill(s.creditsValue, { count: payload.balance })}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.actionSlot}>
            <Pressable
              onPress={() => {
                onClose();
                router.navigate("/(partner)/(tabs)");
              }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{s.backToHome}</Text>
            </Pressable>
          </View>
          {order && onViewDetails ? (
            <View style={styles.actionSlot}>
              <AppCtaButton
                label={s.viewDetails}
                width="full"
                style={styles.primaryBtn}
                onPress={() => onViewDetails(order.id)}
              />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 4,
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  hero: { alignItems: "center", overflow: "visible" },
  celebrationHost: {
    width: "100%",
    height: 180,
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
  customerCard: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: UI.iconWell },
  avatarFallback: {
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 22, fontFamily: "Poppins-Bold", color: UI.purple },
  customerLabel: { fontSize: 11, fontFamily: "Poppins-Medium", color: UI.muted },
  customerName: { fontSize: 16, fontFamily: "Poppins-Bold", color: UI.text },
  muted: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
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
  infoBlock: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8F7FF",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: "Poppins-Medium", color: UI.muted, minWidth: 64 },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    textAlign: "right",
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: UI.chipBorder },
  creditsCard: { gap: 10 },
  creditsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  creditsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  creditsLabel: { flex: 1, fontSize: 14, fontFamily: "Poppins-Medium", color: UI.text },
  creditsValue: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.text },
  balanceValue: { color: UI.purple },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: UI.text },
  totalValue: { fontSize: 18, fontFamily: "Poppins-Bold", color: UI.text },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: UI.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
  },
  actionSlot: { flex: 1, minWidth: 0 },
  primaryBtn: { minHeight: 52 },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 13, fontFamily: "Poppins-SemiBold", color: UI.purpleDeep },
  pressed: { opacity: 0.85 },
});
