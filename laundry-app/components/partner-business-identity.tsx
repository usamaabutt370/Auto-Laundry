import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useLocale } from "@/contexts/locale-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { getStrings } from "@/locales";
import { UI } from "@/constants/theme";
import {
  getPartnerHoursRange,
  getPartnerOpenStatus,
  type PartnerOpenStatus,
} from "@/utils/partner-hours";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function formatPartnerRatingAvg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatPartnerDistanceKm(km: number): string {
  if (km < 1) return Math.max(0.1, km).toFixed(1);
  return km.toFixed(1);
}

type IdentityCopy = {
  verifiedPartner: string;
  reviewsCount: string;
  reviewsCountOne: string;
  noReviewsYet: string;
  kmAway: string;
  openNow: string;
  closed: string;
  hoursUnknown: string;
  closesAt: string;
  opensAt: string;
};

export function buildPartnerBusinessIdentityMeta(args: {
  copy: IdentityCopy;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  /** Numeric km; formatted with copy.kmAway */
  distanceKm?: number | null;
  availableTime?: string | null;
}): {
  ratingLabel: string | null;
  reviewsLabel: string;
  distanceLabel: string | null;
  openStatus: PartnerOpenStatus;
  openLabel: string;
  hoursHint: string | null;
} {
  const { copy: s } = args;
  const ratingCount = args.ratingCount ?? 0;
  const ratingAvg = args.ratingAvg ?? null;
  const ratingLabel =
    ratingCount > 0 && ratingAvg != null && Number.isFinite(ratingAvg)
      ? formatPartnerRatingAvg(ratingAvg)
      : null;
  const reviewsLabel =
    ratingCount === 1
      ? s.reviewsCountOne
      : ratingCount > 1
        ? fill(s.reviewsCount, { count: ratingCount })
        : s.noReviewsYet;
  const distanceLabel =
    args.distanceKm != null && Number.isFinite(args.distanceKm)
      ? fill(s.kmAway, { km: formatPartnerDistanceKm(args.distanceKm) })
      : null;
  const hours = getPartnerHoursRange(args.availableTime);
  const openStatus = getPartnerOpenStatus(args.availableTime);
  const openLabel =
    openStatus === "open" ? s.openNow : openStatus === "closed" ? s.closed : s.hoursUnknown;
  const hoursHint =
    openStatus === "open" && hours
      ? fill(s.closesAt, { time: hours.endLabel })
      : openStatus === "closed" && hours
        ? fill(s.opensAt, { time: hours.startLabel })
        : hours?.rangeLabel ?? null;

  return { ratingLabel, reviewsLabel, distanceLabel, openStatus, openLabel, hoursHint };
}

type Props = {
  name: string;
  verified?: boolean;
  ratingLabel?: string | null;
  reviewsLabel?: string | null;
  distanceLabel?: string | null;
  openStatus?: PartnerOpenStatus;
  openLabel?: string | null;
  hoursHint?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Shared business identity block — matches launderer detail header. */
export function PartnerBusinessIdentity({
  name,
  verified = false,
  ratingLabel = null,
  reviewsLabel = null,
  distanceLabel = null,
  openStatus = "unknown",
  openLabel = null,
  hoursHint = null,
  onPress,
  style,
}: Props) {
  const { locale } = useLocale();
  const { isNarrow } = useResponsiveLayout();
  const s = getStrings(locale).customer.laundererDetail;
  const resolvedOpenLabel =
    openLabel ??
    (openStatus === "open" ? s.openNow : openStatus === "closed" ? s.closed : s.hoursUnknown);

  const content = (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.avatarWell,
          isNarrow && { width: 56, height: 56, borderRadius: 28 },
        ]}
      >
        <LinearGradient
          colors={["#A78BFA", "#6366F1"]}
          style={[
            styles.avatarInner,
            isNarrow && { width: 46, height: 46, borderRadius: 23 },
          ]}
        >
          <MaterialCommunityIcons
            name="washing-machine"
            size={isNarrow ? 22 : 28}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {verified ? (
          <View style={styles.verifiedRow}>
            <MaterialCommunityIcons name="check-decagram" size={14} color={UI.teal} />
            <Text style={styles.verifiedText}>{s.verifiedPartner}</Text>
          </View>
        ) : null}
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={15} color={UI.star} />
          <Text style={styles.metaStrong}>{ratingLabel ?? "—"}</Text>
          {reviewsLabel ? <Text style={styles.metaMuted}>({reviewsLabel})</Text> : null}
        </View>
        <View style={styles.locHoursBlock}>
          {distanceLabel ? (
            <View style={styles.metaCluster}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.purple} />
              <Text style={styles.metaMuted} numberOfLines={1}>
                {distanceLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaCluster}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={openStatus === "open" ? UI.openText : UI.muted}
            />
            <Text
              style={[
                styles.openText,
                openStatus === "closed" && styles.closedText,
                openStatus === "unknown" && styles.mutedText,
              ]}
            >
              {resolvedOpenLabel}
            </Text>
            {hoursHint ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaMuted} numberOfLines={1}>
                  {hoursHint}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 18,
    color: UI.text,
    fontFamily: "Poppins-Bold",
    lineHeight: 24,
  },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 12, color: UI.teal, fontFamily: "Poppins-SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  locHoursBlock: { marginTop: 4, gap: 4 },
  metaCluster: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  metaStrong: { fontSize: 13, color: UI.text, fontFamily: "Poppins-Bold" },
  metaMuted: { fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  metaDot: { color: UI.muted, marginHorizontal: 2, fontSize: 12 },
  openText: { fontSize: 12, color: UI.openText, fontFamily: "Poppins-SemiBold" },
  closedText: { color: UI.closedText },
  mutedText: { color: UI.muted },
  pressed: { opacity: 0.88 },
});
