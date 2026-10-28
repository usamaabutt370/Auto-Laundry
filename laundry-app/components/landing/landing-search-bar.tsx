import { MaterialCommunityIcons } from "@expo/vector-icons";
import { forwardRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInput as TextInputType,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { UI } from "@/constants/theme";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  cityLabel?: string;
  onSearch?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Shared landing search bar — one instance moves between hero and providers. */
export const LandingSearchBar = forwardRef<TextInputType, Props>(function LandingSearchBar(
  {
    query,
    onQueryChange,
    cityLabel = "Lahore",
    onSearch,
    onFocus,
    onBlur,
    autoFocus,
    style,
  },
  ref,
) {
  return (
    <View style={[styles.searchBar, style]}>
      <View style={styles.searchField}>
        <MaterialCommunityIcons name="magnify" size={20} color={UI.muted} />
        <TextInput
          ref={ref}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search by business name"
          placeholderTextColor={UI.muted}
          style={styles.searchInput}
          onSubmitEditing={onSearch}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
          accessibilityLabel="Search providers by business name"
        />
      </View>
      <View style={styles.searchDivider} />
      <View style={styles.locationField}>
        <MaterialCommunityIcons name="map-marker" size={16} color={UI.blue} />
        <Text style={styles.locationText} numberOfLines={1}>
          {cityLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={UI.muted} />
      </View>
      <Pressable
        style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]}
        onPress={onSearch}
        // Keep focus long enough for Search press before blur undocks the bar.
        onPressIn={(event) => {
          if (Platform.OS === "web") {
            event.preventDefault?.();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Text style={styles.searchBtnText}>Search</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={UI.card} />
      </Pressable>
    </View>
  );
});

/** Keeps hero layout stable while the search bar is docked above providers. */
export const LANDING_SEARCH_BAR_SLOT_HEIGHT = 58;

const cardShadow = {
  shadowColor: "rgba(17, 24, 39, 0.12)",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 1,
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: UI.card,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    maxWidth: 580,
    width: "100%",
    ...cardShadow,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 140,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: UI.text,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: UI.chipBorder,
    marginHorizontal: 8,
  },
  locationField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
    maxWidth: 80,
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: UI.blue,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginLeft: 8,
  },
  searchBtnText: {
    color: UI.card,
    fontWeight: "700",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
