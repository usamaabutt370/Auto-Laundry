import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { AppCtaButton } from "@/components/ui/cta-button";
import { UI } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import type {
  CustomerOrderDbStatus,
  CustomerOrderListItem,
} from "@/lib/customer-orders";

type OrderCardStrings = {
  orderRef: string;
  estTotal: string;
  schedulePending: string;
  servicesNone: string;
  yourServices: string;
  statusPending: string;
  statusAccepted: string;
  statusRejected: string;
  statusCompleted: string;
  statusWaiting: string;
  statusInProgress: string;
  statusReady: string;
  chatProvider: string;
  trackOrder: string;
  pickupFrom: string;
  addOns: string;
  addOnOne: string;
  stepSent: string;
  stepConfirmed: string;
  stepPickedUp: string;
  stepOnTheWay: string;
  stepCompleted: string;
  reviewsCount: string;
};

type CustomerOrderCardProps = {
  order: CustomerOrderListItem;
  strings: OrderCardStrings;
  onOpenDetail: () => void;
  onTrack: () => void;
  onChat: () => void;
};

const PROGRESS_STEPS = [
  { key: "sent", labelKey: "stepSent" as const },
  { key: "confirmed", labelKey: "stepConfirmed" as const },
  { key: "picked", labelKey: "stepPickedUp" as const },
  { key: "onWay", labelKey: "stepOnTheWay" as const },
  { key: "completed", labelKey: "stepCompleted" as const },
];

function progressIndex(status: CustomerOrderDbStatus): number {
  switch (status) {
    case "draft":
    case "submitted":
      return 0;
    case "accepted":
      return 1;
    case "in_progress":
      return 2;
    case "ready":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

function statusCopy(
  order: CustomerOrderListItem,
  s: OrderCardStrings,
): { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap } {
  if (order.displayStatus === "rejected" || order.rawStatus === "cancelled") {
    return { label: s.statusRejected, color: UI.red, bg: UI.redBg, icon: "close-circle-outline" };
  }
  if (order.rawStatus === "completed") {
    return { label: s.statusCompleted, color: UI.openText, bg: UI.openBg, icon: "check-circle-outline" };
  }
  if (order.rawStatus === "ready") {
    return { label: s.statusReady, color: UI.openText, bg: UI.openBg, icon: "truck-delivery-outline" };
  }
  if (order.rawStatus === "in_progress") {
    return { label: s.statusInProgress, color: UI.openText, bg: UI.openBg, icon: "washing-machine" };
  }
  if (order.rawStatus === "accepted") {
    return { label: s.statusAccepted, color: UI.openText, bg: UI.openBg, icon: "storefront-outline" };
  }
  return { label: s.statusWaiting, color: UI.amber, bg: UI.amberBg, icon: "clock-outline" };
}

function shortAddress(address: string | null): string {
  if (!address?.trim()) return "";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return parts[0] ?? address;
}

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) =>
      acc.replaceAll(`{{${key}}}`, String(value)).replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function CustomerOrderCard({
  order,
  strings: s,
  onOpenDetail,
  onTrack,
  onChat,
}: CustomerOrderCardProps) {
  const { s: scaleSize, ms, isNarrow } = useResponsiveLayout();
  const status = useMemo(() => statusCopy(order, s), [order, s]);
  const activeStep = progressIndex(order.rawStatus);
  const showTrack = order.displayStatus !== "rejected";
  const partnerImg = scaleSize(isNarrow ? 44 : 52);

  const previewItems = (order.itemPreview.length > 0
    ? order.itemPreview
    : order.servicesSummary
      ? [{ name: order.servicesSummary, quantity: 0, priceLabel: null as string | null }]
      : []
  ).slice(0, 2);

  const ratingLabel =
    order.partnerRatingAvg != null && order.partnerRatingCount > 0
      ? Number.isInteger(order.partnerRatingAvg)
        ? String(order.partnerRatingAvg)
        : order.partnerRatingAvg.toFixed(1)
      : null;

  const showLogistics = order.fulfillmentMode === "pickupDelivery";
  const isCompleted = order.displayStatus === "completed";
  const scheduleDay = isCompleted
    ? order.deliveryDayLabel || order.pickupDayLabel
    : order.pickupDayLabel || order.deliveryDayLabel;
  const scheduleTime = isCompleted
    ? order.deliveryTimeLabel || order.pickupTimeLabel
    : order.pickupTimeLabel || order.deliveryTimeLabel;
  const pickupArea = shortAddress(order.customerPickupAddress);

  return (
    <Pressable
      onPress={onOpenDetail}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        {order.partnerImageUrl ? (
          <Image
            source={{ uri: order.partnerImageUrl }}
            style={[styles.partnerImage, { width: partnerImg, height: partnerImg }]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.partnerImage,
              styles.partnerImageFallback,
              { width: partnerImg, height: partnerImg },
            ]}
          >
            <MaterialCommunityIcons name="storefront-outline" size={isNarrow ? 18 : 22} color={UI.muted} />
          </View>
        )}
        <View style={styles.headerCopy}>
          <PartnerNameWithBadge
            name={order.partnerName}
            verified={order.partnerVerified}
            numberOfLines={1}
            nameStyle={[styles.partnerName, { fontSize: ms(isNarrow ? 14 : 15) }]}
            containerStyle={styles.partnerNameRow}
          />
          <View style={styles.orderStatusRow}>
            <Text style={styles.orderRef} numberOfLines={1}>
              {fill(s.orderRef, { ref: order.orderRef })}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <MaterialCommunityIcons name={status.icon} size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
                {status.label}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            {ratingLabel ? (
              <>
                <MaterialCommunityIcons name="star" size={13} color={UI.star} />
                <Text style={styles.metaStrong}>{ratingLabel}</Text>
                <Text style={styles.metaMuted}>
                  {fill(s.reviewsCount, { count: order.partnerRatingCount })}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.servicesSection}>
        <View style={styles.divider} />
        <View style={styles.servicesBlock}>
          <Text style={styles.servicesHeading}>{s.yourServices}</Text>
          {previewItems.length > 0 ? (
            previewItems.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.serviceRow}>
                <Text style={styles.serviceLine} numberOfLines={1}>
                  {item.quantity > 0 ? `${item.name} × ${item.quantity}` : item.name}
                </Text>
                {item.priceLabel ? (
                  <Text style={styles.servicePrice} numberOfLines={1}>
                    {item.priceLabel}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.serviceLine}>{s.servicesNone}</Text>
          )}
          {order.addOnCount > 0 ? (
            <Text style={styles.addOnText}>
              {order.addOnCount === 1
                ? s.addOnOne
                : fill(s.addOns, { count: order.addOnCount })}
            </Text>
          ) : null}
        </View>
      </View>

      {showLogistics ? (
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#2563EB" style={styles.infoIcon} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoPrimary} numberOfLines={1}>
                {scheduleDay || s.schedulePending}
              </Text>
              <Text style={styles.infoSecondary} numberOfLines={1}>
                {scheduleTime || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#2563EB" style={styles.infoIcon} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoSecondary} numberOfLines={1}>
                {s.pickupFrom}
              </Text>
              <Text style={styles.infoPrimary} numberOfLines={1}>
                {pickupArea || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <View style={styles.infoCopy}>
              <Text style={styles.infoSecondary} numberOfLines={1}>
                {s.estTotal}
              </Text>
              <Text style={styles.totalValue} numberOfLines={1}>
                {order.estimatedTotalLabel}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.dropoffTotalRow}>
          <Text style={styles.infoSecondary}>{s.estTotal}</Text>
          <Text style={styles.totalValue}>{order.estimatedTotalLabel}</Text>
        </View>
      )}

      {activeStep >= 0 ? (
        <View style={styles.progressTrack}>
          <View style={styles.progressRail} />
          {activeStep > 0 ? (
            <View
              style={[
                styles.progressRailFill,
                { width: `${(activeStep / (PROGRESS_STEPS.length - 1)) * 100}%` },
              ]}
            />
          ) : null}
          {PROGRESS_STEPS.map((step, index) => {
            const done = index <= activeStep;
            return (
              <View key={step.key} style={styles.progressStep}>
                <View style={[styles.progressDot, done && styles.progressDotDone]}>
                  <MaterialCommunityIcons
                    name="check"
                    size={10}
                    color={done ? "#FFFFFF" : "#D1D5DB"}
                  />
                </View>
                <Text
                  style={[styles.progressLabel, done && styles.progressLabelDone]}
                  numberOfLines={1}
                >
                  {s[step.labelKey]}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <AppCtaButton
          label={s.chatProvider}
          onPress={() => {
            onChat();
          }}
          width={showTrack ? 48 : "full"}
          variant="outline"
          size="sm"
          leftIcon="chat-processing-outline"
          style={styles.actionBtn}
        />
        {showTrack ? (
          <AppCtaButton
            label={s.trackOrder}
            onPress={() => {
              onTrack();
            }}
            width={52}
            size="sm"
            rightIcon="arrow-right"
            style={styles.actionBtn}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    padding: 14,
    gap: 6,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: { opacity: 0.92 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  partnerImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: UI.iconWell,
  },
  partnerImageFallback: { alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  partnerNameRow: { alignItems: "center", width: "100%" },
  partnerName: { fontSize: 15, fontFamily: "Poppins-Bold", color: UI.text },
  orderStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  orderRef: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: UI.muted,
    marginTop: 5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaStrong: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.text },
  metaMuted: { fontSize: 12, fontFamily: "Poppins-Regular", color: UI.muted },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 150,
    flexShrink: 0,
    marginTop: -15,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI.chipBorder,
  },
  servicesSection: { gap: 5 },
  servicesBlock: { gap: 2 },
  servicesHeading: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  serviceLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  servicePrice: {
    flexShrink: 0,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  addOnText: { marginTop: 2, fontSize: 12, fontFamily: "Poppins-Medium", color: UI.purple },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    paddingVertical: 2,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoCopy: { flex: 1, minWidth: 0, gap: 2 },
  infoDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: UI.chipBorder,
    marginHorizontal: 2,
  },
  infoPrimary: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: UI.text, lineHeight: 16 },
  infoSecondary: { fontSize: 11, fontFamily: "Poppins-Regular", color: UI.muted, lineHeight: 14 },
  totalValue: { fontSize: 14, fontFamily: "Poppins-Bold", color: UI.text, lineHeight: 18 },
  dropoffTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressTrack: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
    position: "relative",
  },
  progressRail: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 11,
    height: 2,
    backgroundColor: "#E5E7EB",
    borderRadius: 1,
  },
  progressRailFill: {
    position: "absolute",
    left: "10%",
    top: 11,
    height: 2,
    backgroundColor: UI.teal,
    borderRadius: 1,
  },
  progressStep: { flex: 1, alignItems: "center", gap: 4 },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: UI.card,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressDotDone: {
    backgroundColor: UI.teal,
    borderColor: UI.teal,
  },
  progressLabel: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    fontFamily: "Poppins-Medium",
    color: UI.muted,
  },
  progressLabelDone: {
    color: UI.text,
    fontFamily: "Poppins-SemiBold",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    minHeight: 40,
  },
});
