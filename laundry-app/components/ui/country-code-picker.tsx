import { theme } from "@/constants/theme";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CountryPicker, {
  type Country,
  type CountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";

export interface SelectedCountry {
  callingCode: string;
  cca2: CountryCode;
}

interface CountryCodePickerProps {
  selectedCca2: CountryCode;
  selectedCallingCode: string;
  onSelect: (country: SelectedCountry) => void;
}

export function CountryCodePicker({
  selectedCca2,
  selectedCallingCode,
  onSelect,
}: CountryCodePickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (country: Country) => {
    onSelect({
      callingCode: country.callingCode[0],
      cca2: country.cca2,
    });
    setIsVisible(false);
  };

  return (
    <Pressable
      onPress={() => setIsVisible(true)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <CountryPicker
        countryCode={selectedCca2}
        withFilter
        withFlag
        withCallingCode
        withEmoji
        onSelect={handleSelect}
        onClose={() => setIsVisible(false)}
        visible={isVisible}
        containerButtonStyle={styles.pickerButton}
        theme={{
          ...DARK_THEME,
          backgroundColor: theme.colors.blue900,
          onBackgroundTextColor: theme.colors.white,
        }}
      />
      <Text style={styles.callingCodeText}>+{selectedCallingCode}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  pickerButton: {
    marginRight: 4,
  },
  callingCodeText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
