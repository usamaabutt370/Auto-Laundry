import { theme } from "@/constants/theme";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, type TextStyle, type ViewStyle } from "react-native";
import CountryPicker, {
  type Country,
  type CountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface SelectedCountry {
  callingCode: string;
  cca2: CountryCode;
}

interface CountryCodePickerProps {
  selectedCca2: CountryCode;
  selectedCallingCode: string;
  onSelect: (country: SelectedCountry) => void;
}

const HEADER_ROW_HEIGHT = 48;

export function CountryCodePicker({
  selectedCca2,
  selectedCallingCode,
  onSelect,
}: CountryCodePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const headerTopInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
    Platform.OS === "android" ? 12 : 0,
  );

  const modalHeaderStyles = useMemo(
    () => ({
      closeButton: {
        marginTop: headerTopInset,
        height: HEADER_ROW_HEIGHT,
        justifyContent: "center" as const,
      } satisfies ViewStyle,
      filter: {
        marginTop: headerTopInset,
        height: HEADER_ROW_HEIGHT,
        flex: 1,
        width: "100%" as const,
        marginRight: 16,
        paddingHorizontal: 4,
      } satisfies TextStyle,
    }),
    [headerTopInset],
  );

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
        closeButtonStyle={modalHeaderStyles.closeButton}
        closeButtonImageStyle={styles.closeButtonImage}
        filterProps={{ style: modalHeaderStyles.filter }}
        modalProps={{
          statusBarTranslucent: false,
        }}
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
  closeButtonImage: {
    height: 22,
    width: 22,
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
