import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

type Item = {
  id: string;
  title: string;
  location: string;
  image?: string | null;
  imageAsset?: number;
};

type Props = {
  item: Item;
  onSelect: (item: Item) => void;
  scrollX?: number;
  cardIndex?: number;
};

/** Native recent-search card (no mouse parallax). */
export function LandingRecentSearchCard({ item, onSelect }: Props) {
  return (
    <Pressable
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
  );
}

const styles = StyleSheet.create({
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
