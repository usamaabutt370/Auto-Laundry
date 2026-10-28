import { forwardRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { UI } from "@/constants/theme";
import { LandingContainer } from "./landing-container";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  cityLabel?: string;
  resultCount?: number;
};

/** Search bar shown above Nearby Providers — live-filters by business name. */
export const LandingProvidersSearch = forwardRef<TextInput, Props>(
  function LandingProvidersSearch(
    { query, onQueryChange, cityLabel = "Lahore", resultCount },
    ref,
  ) {
    const trimmed = query.trim();

    return (
      <View style={styles.wrap}>
        <LandingContainer>
          <View style={styles.bar}>
            <MaterialCommunityIcons name="magnify" size={20} color={UI.muted} />
            <TextInput
              ref={ref}
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search by business name"
              placeholderTextColor={UI.muted}
              style={styles.input}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search providers by business name"
            />
            <View style={styles.divider} />
            <View style={styles.location}>
              <MaterialCommunityIcons name="map-marker" size={16} color={UI.blue} />
              <Text style={styles.locationText} numberOfLines={1}>
                {cityLabel}
              </Text>
            </View>
          </View>
          {trimmed.length > 0 && resultCount != null ? (
            <Text style={styles.hint}>
              {resultCount === 0
                ? `No providers match “${trimmed}”`
                : `${resultCount} provider${resultCount === 1 ? "" : "s"} matching “${trimmed}”`}
            </Text>
          ) : null}
        </LandingContainer>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
    backgroundColor: UI.card,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: UI.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "rgba(17, 24, 39, 0.1)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: UI.text,
    minWidth: 120,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: UI.chipBorder,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
    maxWidth: 100,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: UI.muted,
    fontWeight: "500",
  },
});
