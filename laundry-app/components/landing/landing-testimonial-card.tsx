import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { UI } from "@/constants/theme";
import type { LandingPublicReview } from "@/lib/partner-discovery";

type Props = {
  item: LandingPublicReview;
  width: number;
  accent?: "orange" | "blue";
};

/** Native testimonial card (no Info Cards hover). */
export function LandingTestimonialCard({ item, width }: Props) {
  const stars = Math.max(0, Math.min(5, Math.round(item.rating)));

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, starIndex) => (
          <MaterialCommunityIcons
            key={starIndex}
            name={starIndex < stars ? "star" : "star-outline"}
            size={16}
            color={starIndex < stars ? UI.star : UI.chipBorder}
          />
        ))}
      </View>
      <Text style={styles.quote}>&ldquo;{item.message}&rdquo;</Text>
      <View style={styles.attribution}>
        {item.reviewerImageUrl ? (
          <Image
            source={{ uri: item.reviewerImageUrl }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.reviewerInitial}</Text>
          </View>
        )}
        <View style={styles.attributionCopy}>
          <Text style={styles.name} numberOfLines={1}>
            {item.reviewerName}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {item.locationLabel} • {item.businessName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "rgba(17, 24, 39, 0.14)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 4,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 12,
  },
  quote: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
    color: UI.text,
    marginBottom: 18,
    minHeight: 72,
  },
  attribution: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attributionCopy: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.chipBorder,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.card,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.text,
  },
  detail: {
    fontSize: 12,
    color: UI.muted,
    marginTop: 2,
  },
});
