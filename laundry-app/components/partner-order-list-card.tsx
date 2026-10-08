import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UI } from "@/constants/theme";
import type { PartnerOrderListItem, PartnerOrderStatus } from "@/lib/partner-orders";
import { imageForServiceItem } from "@/lib/service-item-images";
import type { getStrings } from "@/locales";

type Copy = ReturnType<typeof getStrings>["partner"]["order"];
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function formatMoney(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
  return `Rs ${formatted}`;
}

function formatAgo(iso: string | null, copy: Copy): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return copy.justNow;
  if (mins < 60) return copy.minutesAgo.replace("{{count}}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return copy.hoursAgo.replace("{{count}}", String(hours));
  return copy.daysAgo.replace("{{count}}", String(Math.floor(hours / 24)));
}

function serviceName(order: PartnerOrderListItem, copy: Copy): string {
  const base =
    order.primaryServiceKey === "washAndFold"
      ? copy.washFold
      : order.primaryServiceKey === "press"
        ? copy.ironing
        : order.primaryServiceKey === "dryCleaning"
          ? copy.dryCleaning
          : order.primaryServiceKey === "tailoring"
            ? copy.tailoring
            : order.primaryServiceLabel || copy.service;
  return order.extraServiceCount > 0 ? `${base} +${order.extraServiceCount}` : base;
}

function progressIndex(status: PartnerOrderStatus): number {
  if (status === "accepted") return 0;
  if (status === "in_progress") return 2;
  if (status === "ready" || status === "completed") return 3;
  return -1;
}

export function PartnerOrderListCard({
  order,
  copy,
  localeTag,
  onPress,
  onAccept,
  onDecline,
  actionsDisabled,
}: {
  order: PartnerOrderListItem;
  copy: Copy;
  localeTag: string;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  actionsDisabled?: boolean;
}) {
  const isNew = order.rawStatus === "submitted";
  const isCompleted = order.rawStatus === "completed";
  const isActive =
    order.rawStatus === "accepted" ||
    order.rawStatus === "in_progress" ||
    order.rawStatus === "ready";
  const badge =
    isNew
      ? { label: copy.statusNew, bg: "#FFF1F2", color: "#E11D48" }
      : isCompleted
        ? { label: copy.statusCompleted, bg: "#ECFDF3", color: "#16A34A" }
        : order.rawStatus === "ready"
          ? { label: copy.statusReady, bg: "#EFF6FF", color: "#2563EB" }
          : { label: copy.statusInProgress, bg: "#EFF6FF", color: "#2563EB" };
  const itemLabel =
    order.itemCount === 1
      ? copy.itemCountOne
      : copy.itemCount.replace("{{count}}", String(order.itemCount));
  const scheduleParts = [
    order.pickupWhen ? copy.pickupLine.replace("{{when}}", order.pickupWhen) : null,
    order.deliveryWhen ? copy.deliveryLine.replace("{{when}}", order.deliveryWhen) : null,
  ].filter(Boolean);
  const schedule =
    scheduleParts.length > 0
      ? scheduleParts.join("  ·  ")
      : copy.dropoff;
  const completedLabel =
    isCompleted && order.updatedAtIso
      ? copy.completedOn.replace(
          "{{date}}",
          new Intl.DateTimeFormat(localeTag, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(order.updatedAtIso)),
        )
      : null;

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} style={styles.main}>
        <View style={styles.thumb}>
          <Image
            source={imageForServiceItem(undefined, undefined, order.primaryServiceKey)}
            style={styles.thumbImage}
            contentFit="cover"
          />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.ref} numberOfLines={1}>
              {order.orderRef}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <Text style={styles.ago}>{formatAgo(order.createdAtIso, copy)}</Text>
          </View>
          <View style={styles.serviceRow}>
            <Text style={styles.service} numberOfLines={1}>
              {serviceName(order, copy)}
              <Text style={styles.muted}>  ·  {itemLabel}</Text>
            </Text>
            <Text style={styles.price}>{formatMoney(order.amount)}</Text>
          </View>
          <Meta icon="account-outline" text={order.customerName} />
          {order.addressPreview ? <Meta icon="map-marker-outline" text={order.addressPreview} /> : null}
          {completedLabel ? (
            <Meta icon="calendar-blank-outline" text={completedLabel} />
          ) : (
            <Meta icon="clock-outline" text={schedule} />
          )}
        </View>
      </Pressable>

      {isNew ? (
        <View style={styles.actionRow}>
          {order.customerNote ? (
            <View style={styles.note}>
              <MaterialCommunityIcons name="message-text-outline" size={14} color="#E11D48" />
              <View style={styles.noteBody}>
                <Text style={styles.noteTitle}>{copy.customerNote}</Text>
                <Text style={styles.noteText} numberOfLines={1}>
                  {order.customerNote.replace(/\s+/g, " ").trim()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noteSpacer} />
          )}
          <View style={styles.actions}>
            <Pressable
              disabled={actionsDisabled}
              onPress={onDecline}
              style={({ pressed }) => [styles.declineBtn, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="close" size={14} color="#E11D48" />
              <Text style={styles.declineText}>{copy.decline}</Text>
            </Pressable>
            <Pressable
              disabled={actionsDisabled}
              onPress={onAccept}
              style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              <Text style={styles.acceptText}>{copy.accept}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isActive ? (
        <View style={styles.progressRow}>
          <Progress status={order.rawStatus} copy={copy} />
          <Pressable onPress={onPress} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}>
            <Text style={styles.detailsText}>{copy.viewDetails}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.completedActions}>
          <Pressable onPress={onPress} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}>
            <Text style={styles.detailsText}>{copy.viewDetails}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={14} color={UI.muted} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function Progress({ status, copy }: { status: PartnerOrderStatus; copy: Copy }) {
  const steps: { label: string; icon: IconName }[] = [
    { label: copy.stepAccepted, icon: "check" },
    { label: copy.stepPickedUp, icon: "truck-outline" },
    { label: copy.stepInProcess, icon: "circle-outline" },
    { label: copy.stepReady, icon: "hanger" },
  ];
  const active = progressIndex(status);
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => {
        const done = index <= active;
        return (
          <View key={step.label} style={styles.step}>
            {index > 0 ? (
              <View style={[styles.stepLine, index <= active && styles.stepLineDone]} />
            ) : (
              <View style={styles.stepLineSpacer} />
            )}
            <View style={[styles.stepIcon, done && styles.stepIconDone]}>
              <MaterialCommunityIcons
                name={done ? step.icon : index === 2 ? "circle-outline" : step.icon}
                size={12}
                color={done ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    gap: 10,
  },
  main: { flexDirection: "row", gap: 10 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  thumbImage: {
    width: 64,
    height: 64,
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ref: { fontSize: 13, fontWeight: "800", color: UI.text, flexShrink: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  ago: { marginLeft: "auto", fontSize: 11, color: UI.muted, fontWeight: "600" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  service: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1E3A8A" },
  muted: { color: UI.muted, fontWeight: "500" },
  price: { fontSize: 15, fontWeight: "800", color: UI.text },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { flex: 1, fontSize: 12, color: UI.muted },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  note: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noteSpacer: { flex: 1 },
  noteBody: { flex: 1, minWidth: 0 },
  noteTitle: { fontSize: 11, fontWeight: "700", color: "#BE123C" },
  noteText: { fontSize: 11, color: "#9F1239", marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  declineText: { color: "#E11D48", fontWeight: "700", fontSize: 12 },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  completedActions: { alignItems: "flex-end" },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
  },
  detailsText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  steps: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, alignItems: "center" },
  stepLine: {
    position: "absolute",
    top: 9,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: "#E5E7EB",
  },
  stepLineDone: { backgroundColor: "#2563EB" },
  stepLineSpacer: { height: 0 },
  stepIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconDone: { backgroundColor: "#2563EB" },
  stepLabel: { marginTop: 4, fontSize: 9, color: UI.muted, textAlign: "center" },
  stepLabelDone: { color: "#1E3A8A", fontWeight: "700" },
  pressed: { opacity: 0.86 },
});
