import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { LandingContainer } from "./landing-container";

export type RecentSearchItem = {
  id: string;
  title: string;
  location: string;
  image?: string | null;
  imageAsset?: number;
};

/** Demo cards so the section matches the mock before the user searches. */
export const DEMO_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: "demo-1",
    title: "Men's Suit Stitching",
    location: "Lahore",
    imageAsset: assets.images.home_category_tailoring,
  },
  {
    id: "demo-2",
    title: "Laundry - Daily Wear",
    location: "Lahore",
    imageAsset: assets.images.home_deal_laundry,
  },
  {
    id: "demo-3",
    title: "Shirt & Pants Ironing",
    location: "Lahore",
    imageAsset: assets.images.home_category_ironing,
  },
  {
    id: "demo-4",
    title: "Dry Cleaning - Formal",
    location: "Lahore",
    imageAsset: assets.images.home_deal_ironing,
  },
];

type Props = {
  items: RecentSearchItem[];
  onSelect: (item: RecentSearchItem) => void;
};

/** Horizontal recent-search cards matching the marketplace mock. */
export function LandingRecentSearches({ items, onSelect }: Props) {
  const list = items.length > 0 ? items.slice(0, 4) : DEMO_RECENT_SEARCHES;

  return (
    <View style={styles.section}>
      <LandingContainer>
        <Text style={styles.title}>Recent searches</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {list.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover" />
              ) : (
                <Image
                  source={item.imageAsset ?? assets.images.home_deal_laundry}
                  style={styles.thumb}
                  contentFit="cover"
                />
              )}
              <View style={styles.copy}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={12} color={UI.muted} />
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              </View>
              <View style={styles.arrowBtn}>
                <MaterialCommunityIcons name="arrow-right" size={16} color={UI.card} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </LandingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: UI.card,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 16,
  },
  row: {
    gap: 14,
    paddingRight: 8,
  },
  card: {
    width: 300,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: UI.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: UI.muted,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
