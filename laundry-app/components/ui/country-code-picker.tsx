import { theme, UI } from "@/constants/theme";
import { flagEmojiFromCca2 } from "@/utils/flag-emoji";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { CountryCode as PhoneCountryCode } from "libphonenumber-js";
import CountryPicker, {
  type Country,
  type CountryCode as PickerCountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";

export interface SelectedCountry {
  callingCode: string;
  cca2: PhoneCountryCode;
}

interface CountryCodePickerProps {
  selectedCca2: string;
  selectedCallingCode: string;
  onSelect: (country: SelectedCountry) => void;
  appearance?: "dark" | "light";
}

export function CountryCodePicker({
  selectedCca2,
  selectedCallingCode,
  onSelect,
  appearance = "dark",
}: CountryCodePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const light = appearance === "light";

  const handleSelect = (country: Country) => {
    onSelect({
      callingCode: country.callingCode[0],
      cca2: country.cca2 as PhoneCountryCode,
    });
    setIsVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsVisible(true)}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Country code +${selectedCallingCode}`}
      >
        <Text style={styles.flagEmoji}>{flagEmojiFromCca2(selectedCca2)}</Text>
        <Text style={[styles.callingCodeText, light && styles.callingCodeTextLight]}>
          +{selectedCallingCode}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={16}
          color={light ? UI.muted : "rgba(255,255,255,0.75)"}
        />
      </Pressable>
      {isVisible ? (
        <CountryPicker
          countryCode={selectedCca2 as PickerCountryCode}
          withFilter
          withFlag
          withCallingCode
          withEmoji
          onSelect={handleSelect}
          onClose={() => setIsVisible(false)}
          visible
          renderFlagButton={() => null}
          closeButtonStyle={styles.closeButton}
          closeButtonImageStyle={styles.closeButtonImage}
          filterProps={{ style: styles.filter }}
          modalProps={{
            statusBarTranslucent: false,
          }}
          theme={
            light
              ? {
                  backgroundColor: "#FFFFFF",
                  onBackgroundTextColor: "#111827",
                  fontSize: 15,
                  filterPlaceholderTextColor: "#6B7280",
                }
              : {
                  ...DARK_THEME,
                  backgroundColor: theme.colors.blue900,
                  onBackgroundTextColor: theme.colors.white,
                }
          }
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 2,
  },
  flagEmoji: {
    fontSize: 18,
    lineHeight: 22,
    marginRight: 6,
  },
  closeButton: {
    height: 48,
    justifyContent: "center",
  },
  closeButtonImage: {
    height: 22,
    width: 22,
  },
  filter: {
    height: 48,
    flex: 1,
    width: "100%",
    marginRight: 16,
    paddingHorizontal: 4,
  },
  callingCodeText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  callingCodeTextLight: {
    color: UI.text,
  },
  pressed: {
    opacity: 0.7,
  },
});
