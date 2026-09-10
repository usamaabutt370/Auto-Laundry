import { theme } from "@/constants/theme";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { CountryCode as PhoneCountryCode } from "libphonenumber-js";
import CountryPicker, {
  type Country,
  type CountryCode as PickerCountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const HEADER_ROW_HEIGHT = 48;

export function CountryCodePicker({
  selectedCca2,
  selectedCallingCode,
  onSelect,
  appearance = "dark",
}: CountryCodePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const light = appearance === "light";

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
      cca2: country.cca2 as PhoneCountryCode,
    });
    setIsVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsVisible(true)}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        <Text style={[styles.flagPlaceholder, light && styles.flagPlaceholderLight]}>
          {selectedCca2}
        </Text>
        <Text style={[styles.callingCodeText, light && styles.callingCodeTextLight]}>
          +{selectedCallingCode}
        </Text>
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
          closeButtonStyle={modalHeaderStyles.closeButton}
          closeButtonImageStyle={styles.closeButtonImage}
          filterProps={{ style: modalHeaderStyles.filter }}
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
    height: "100%",
  },
  pickerButton: {
    marginRight: 4,
  },
  flagPlaceholder: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 28,
    marginRight: 4,
  },
  flagPlaceholderLight: {
    color: "#111827",
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
  callingCodeTextLight: {
    color: "#111827",
  },
  pressed: {
    opacity: 0.7,
  },
});
