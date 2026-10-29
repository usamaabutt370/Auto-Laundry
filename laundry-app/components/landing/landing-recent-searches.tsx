import { ScrollView, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { LandingContainer } from "./landing-container";
import { LandingRecentSearchCard } from "./landing-recent-search-card";

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
            <LandingRecentSearchCard key={item.id} item={item} onSelect={onSelect} />
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
    fontSize: 32,
    fontWeight: "800",
    color: UI.text,
    marginBottom: 16,
  },
  row: {
    gap: 14,
    paddingRight: 8,
  },
});
