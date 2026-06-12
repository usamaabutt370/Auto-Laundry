import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "@/constants/theme";

export interface SelectedCountry {
  callingCode: string;
  cca2: CountryCode;
}

interface CountryCodePickerProps {
  selectedCca2: CountryCode;
  selectedCallingCode: string;
  onSelect: (country: SelectedCountry) => void;
}

type CountryOption = {
  cca2: CountryCode;
  callingCode: string;
  label: string;
};

const c = theme.colors;

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((cca2) => {
    try {
      const callingCode = getCountryCallingCode(cca2);
      return {
        cca2,
        callingCode,
        label: `${cca2} (+${callingCode})`,
      };
    } catch {
      return null;
    }
  })
  .filter((row): row is CountryOption => row !== null)
  .sort((a, b) => a.label.localeCompare(b.label));

export function CountryCodePicker({
  selectedCca2,
  selectedCallingCode,
  onSelect,
}: CountryCodePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        row.callingCode.includes(q) ||
        row.cca2.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = (country: CountryOption) => {
    onSelect({
      callingCode: country.callingCode,
      cca2: country.cca2,
    });
    setQuery("");
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
        <Text style={styles.flagText}>{selectedCca2}</Text>
        <Text style={styles.callingCodeText}>+{selectedCallingCode}</Text>
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select country code</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={c.gray50}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {filtered.map((country) => {
                const selected = country.cca2 === selectedCca2;
                return (
                  <Pressable
                    key={country.cca2}
                    onPress={() => handleSelect(country)}
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.rowText}>{country.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setIsVisible(false)}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    gap: 6,
    paddingRight: 4,
  },
  flagText: {
    color: c.white,
    fontSize: 13,
    fontWeight: "700",
  },
  callingCodeText: {
    color: c.white,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: c.sheetBackdrop,
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    maxHeight: "80%",
    backgroundColor: c.blue900,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.modalBorder,
  },
  sheetTitle: {
    color: c.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: c.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.white,
    marginBottom: 12,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowSelected: {
    backgroundColor: c.selectionWash,
  },
  rowText: {
    color: c.white,
    fontSize: 15,
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeBtnText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
  },
});
