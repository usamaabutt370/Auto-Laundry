import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

/**
 * Placeholder tiles until real photos are available.
 * Swap `icon` for an `Image source={...}` per tile once photos are provided —
 * layout/sizing stays the same.
 */
const TILES = [
  { icon: "home-heart" as const, background: c.background },
  { icon: "washing-machine" as const, background: c.blue900 },
  { icon: "cash-multiple" as const, background: c.backgroundDark },
  { icon: "account-group-outline" as const, background: c.blue900 },
  { icon: "star-outline" as const, background: c.background },
];

/** "Captains At Work" — photo strip (placeholder tiles pending real photos). */
export function LandingGallery() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        Captains At <Text style={styles.headingAccent}>Work</Text>
      </Text>

      <View style={styles.strip}>
        {TILES.map((tile, i) => (
          <View key={i} style={[styles.tile, { backgroundColor: tile.background }]}>
            <MaterialCommunityIcons name={tile.icon} size={36} color="rgba(255,255,255,0.85)" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: c.themeWhite,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: c.themeBlack,
    textAlign: "center",
    marginBottom: 36,
  },
  headingAccent: {
    color: c.background,
  },
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  tile: {
    width: 140,
    height: 140,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
