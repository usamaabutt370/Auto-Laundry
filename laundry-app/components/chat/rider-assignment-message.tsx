import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { theme } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import type { RiderAssignmentMetadata } from "@/lib/chat";
import { getStrings } from "@/locales";
import type { UserRole } from "@/types/user";

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  chipBorder: "#E5E7EB",
  mint: "#ECFDF5",
};
const fs = theme.fontSize;

type RiderAssignmentMessageProps = {
  metadata: RiderAssignmentMetadata;
  role: UserRole | null;
  intro?: string;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={16} color={UI.teal} style={styles.detailIcon} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function RiderAssignmentMessage({ metadata, role, intro }: RiderAssignmentMessageProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const s = getStrings(locale).chat.riderAssignment;

  const trackPath =
    role === "launderer" ? "/(partner)/order-detail" : "/(customer)/order-detail";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <MaterialCommunityIcons name="moped" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{s.title}</Text>
          {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        </View>
      </View>

      <View style={styles.riderSection}>
        <Image
          source={{ uri: metadata.riderPhotoUrl }}
          style={styles.riderPhoto}
          contentFit="cover"
          accessibilityLabel={`${metadata.riderName} photo`}
        />
        <Text style={styles.riderLabel}>{s.riderLabel}</Text>
        <Text style={styles.riderName}>{metadata.riderName}</Text>
      </View>

      <View style={styles.detailsBox}>
        <Text style={styles.sectionTitle}>{s.orderDetails}</Text>
        <DetailRow
          icon="pound"
          label={s.orderNumberLabel}
          value={`#${metadata.orderNumber}`}
        />
        <DetailRow icon="hanger" label={s.services} value={metadata.servicesSummary} />
        <DetailRow icon="cash" label={s.estimatedTotal} value={metadata.estimatedTotal} />
        <DetailRow icon="truck-delivery-outline" label={s.pickup} value={metadata.pickup} />
        <DetailRow icon="package-variant-closed" label={s.delivery} value={metadata.delivery} />
        <DetailRow icon="map-marker-outline" label={s.address} value={metadata.address} />
      </View>

      <View style={styles.laundromatBox}>
        <View style={styles.laundromatIconWrap}>
          <MaterialCommunityIcons name="storefront-outline" size={18} color={UI.teal} />
        </View>
        <View style={styles.laundromatTextWrap}>
          <Text style={styles.laundromatLabel}>{s.laundromat}</Text>
          <PartnerNameWithBadge
            name={metadata.partnerName}
            verified={metadata.partnerVerified}
            nameStyle={styles.laundromatName}
            containerStyle={styles.laundromatNameRow}
          />
        </View>
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: trackPath,
            params: { orderId: metadata.orderId },
          })
        }
        style={({ pressed }) => [styles.trackBtn, pressed && styles.pressed]}
      >
        <Text style={styles.trackBtnText}>{s.trackOrder}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: UI.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: UI.text,
  },
  intro: {
    fontSize: fs.descText,
    color: UI.muted,
    lineHeight: 18,
  },
  riderSection: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  riderPhoto: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: UI.teal,
    backgroundColor: UI.bg,
  },
  riderLabel: {
    fontSize: fs.xxSmallText,
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  riderName: {
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: UI.text,
    textAlign: "center",
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: fs.descText,
    fontWeight: "700",
    color: UI.teal,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailTextWrap: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    fontSize: fs.xxSmallText,
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: fs.descText,
    color: UI.text,
    lineHeight: 19,
  },
  laundromatBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 12,
    backgroundColor: UI.mint,
  },
  laundromatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  laundromatTextWrap: {
    flex: 1,
    gap: 4,
  },
  laundromatLabel: {
    fontSize: fs.xxSmallText,
    color: UI.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  laundromatNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  laundromatName: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: UI.text,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.teal,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  trackBtnText: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.85,
  },
});
