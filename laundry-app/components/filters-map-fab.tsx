import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function FiltersMapFab({
  viewMode,
  bottom,
  onFilters,
  onMap,
  filtersLabel,
  mapLabel,
  listLabel,
}: {
  viewMode: "list" | "map";
  bottom: number;
  onFilters: () => void;
  onMap: () => void;
  filtersLabel: string;
  mapLabel: string;
  listLabel: string;
}) {
  const mapOpen = viewMode === "map";
  return (
    <View style={[styles.fabWrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.fabShadow}>
        <LinearGradient
          colors={["#6A26FF", "#0095FF", "#20D5AB"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fab}
        >
          <Pressable
            onPress={onFilters}
            style={styles.fabHalf}
            accessibilityRole="button"
            accessibilityLabel={filtersLabel}
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color="#FFFFFF" />
            <Text style={styles.fabLabel}>{filtersLabel}</Text>
          </Pressable>
          <View style={styles.fabDivider} />
          <Pressable
            onPress={onMap}
            style={styles.fabHalf}
            accessibilityRole="button"
            accessibilityLabel={mapOpen ? listLabel : mapLabel}
          >
            <MaterialCommunityIcons
              name={mapOpen ? "view-grid-outline" : "map-marker"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.fabLabel}>{mapOpen ? listLabel : mapLabel}</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  fabShadow: {
    borderRadius: 20,
    shadowColor: "rgba(17, 24, 39, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fab: {
    flexDirection: "row",
    height: 40,
    minWidth: 252,
    borderRadius: 20,
    overflow: "hidden",
  },
  fabHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 22,
  },
  fabDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  fabLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
});
