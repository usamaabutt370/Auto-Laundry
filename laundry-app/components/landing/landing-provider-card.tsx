import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import {
  formatLandingDistance,
  serviceTypeLabel,
  type LandingProvider,
} from "@/hooks/use-landing-providers";

type Props = {
  partner: LandingProvider;
  onViewProfile: () => void;
  cardWidth?: number | `${number}%`;
};

function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("+") ? digits.slice(1) : digits;
  return `https://wa.me/${normalized}`;
}

/** Provider card matching the marketplace mock. */
export function LandingProviderCard({ partner, onViewProfile, cardWidth = "100%" }: Props) {
  const tags = partner.serviceTypes.slice(0, 2).map(serviceTypeLabel);
  const phone = partner.phone_number?.trim() ?? "";
  const wa = phone ? whatsappUrl(phone) : null;
  const area =
    partner.address
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(-2)
      .join(", ") ?? "Lahore";
  const ratingLabel =
    partner.ratingAvg != null
      ? `${partner.ratingAvg.toFixed(1)}${
          partner.ratingCount > 0 ? ` (${partner.ratingCount})` : ""
        }`
      : "—";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
      onPress={onViewProfile}
      accessibilityRole="button"
      accessibilityLabel={`View ${partner.business_name.trim()} profile`}
    >
      <View style={styles.imageWrap}>
        {partner.imageUrl ? (
          <Image source={{ uri: partner.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Image source={assets.onboarding.slide2} style={styles.image} contentFit="cover" />
        )}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{formatLandingDistance(partner.distanceKm)}</Text>
        </View>
        <View style={styles.heartBtn}>
          <MaterialCommunityIcons name="heart-outline" size={16} color={UI.card} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {partner.business_name.trim()}
          </Text>
          {partner.verified ? (
            <View style={styles.verified}>
              <MaterialCommunityIcons name="check-decagram" size={15} color={UI.verified} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="star" size={14} color={UI.star} />
          <Text style={styles.metaText}>{ratingLabel}</Text>
        </View>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.muted} />
          <Text style={styles.metaMuted} numberOfLines={1}>
            {area}
          </Text>
        </View>

        {/* Always reserve tag-row height so cards in a row stay equal. */}
        <View style={styles.tagRow}>
          {tags.length > 0 ? (
            tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tagPlaceholder} />
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.contactBtn,
              !wa && styles.contactDisabled,
              pressed && wa && styles.pressed,
            ]}
            disabled={!wa}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (wa) void Linking.openURL(wa);
            }}
            accessibilityRole="link"
            accessibilityLabel="Contact on WhatsApp"
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color={UI.green} />
            <Text style={styles.contactText}>Contact</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, pressed && styles.pressed]}
            onPress={(event) => {
              event?.stopPropagation?.();
              onViewProfile();
            }}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Text style={styles.profileText}>View Profile</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  imageWrap: {
    height: 148,
    backgroundColor: UI.iconWell,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  distanceBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: UI.distBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  distanceText: {
    color: UI.card,
    fontSize: 11,
    fontWeight: "700",
  },
  heartBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.distBg,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 22,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: UI.text,
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: UI.verified,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 18,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.text,
  },
  metaMuted: {
    flex: 1,
    fontSize: 12,
    color: UI.muted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 26,
  },
  tagPlaceholder: {
    height: 26,
    width: 1,
  },
  tag: {
    backgroundColor: UI.bg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: UI.muted,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: "auto",
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: UI.mint,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: UI.teal,
  },
  contactDisabled: {
    opacity: 0.45,
  },
  contactText: {
    color: UI.green,
    fontWeight: "700",
    fontSize: 13,
  },
  profileBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: UI.blue,
    backgroundColor: UI.card,
  },
  profileText: {
    color: UI.blue,
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
});
