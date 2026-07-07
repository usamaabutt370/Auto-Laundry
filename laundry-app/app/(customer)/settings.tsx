import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MapSearchRadiusSlider } from "@/components/map-search-radius-slider";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useSuppressWebScreenHeader } from "@/hooks/use-suppress-web-screen-header";
import { goBackToCustomerHome } from "@/utils/customer-navigation";

const c = theme.colors;
const CARD_BG = c.blue900;
const TOGGLE_ON = "#34C759";

type LanguageId = "english" | "urdu";
type ReminderHoursId = "6" | "12" | "24";

function RadioOption<Id extends string>({
  id,
  label,
  selected,
  onSelect,
}: {
  id: Id;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isWeb } = useResponsiveLayout();
  useSuppressWebScreenHeader();
  const s = strings.customer.settings;

  const [language, setLanguage] = useState<LanguageId>("english");
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [reminderHours, setReminderHours] = useState<ReminderHoursId>("6");
  const [mileRadius, setMileRadius] = useState(5);

  return (
    <View style={styles.container}>
      {!isWeb ? (
        <SafeAreaView style={styles.header} edges={["top"]}>
          <Pressable
            onPress={() => goBackToCustomerHome(router)}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
          <View style={styles.headerSpacer} />
        </SafeAreaView>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{s.language}</Text>
          <View style={styles.radioRowWrap}>
            <RadioOption
              id="english"
              label={s.english}
              selected={language === "english"}
              onSelect={() => setLanguage("english")}
            />
            <RadioOption
              id="spanish"
              label={s.urdu}
              selected={language === "urdu"}
              onSelect={() => setLanguage("urdu")}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleNoMargin}>{s.notifications}</Text>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={{ false: c.backgroundLight, true: TOGGLE_ON }}
              thumbColor={c.white}
              ios_backgroundColor={c.backgroundLight}
            />
          </View>
          {notificationsOn && (
            <>
              <Text style={styles.cardSubtitle}>{s.recurringReminder}</Text>
              <View style={styles.radioColumn}>
                <RadioOption
                  id="6"
                  label={s.reminder6h}
                  selected={reminderHours === "6"}
                  onSelect={() => setReminderHours("6")}
                />
                <RadioOption
                  id="12"
                  label={s.reminder12h}
                  selected={reminderHours === "12"}
                  onSelect={() => setReminderHours("12")}
                />
                <RadioOption
                  id="24"
                  label={s.reminder24h}
                  selected={reminderHours === "24"}
                  onSelect={() => setReminderHours("24")}
                />
              </View>
            </>
          )}
        </View>

        {/* Mile Radius */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{s.mileRadius}</Text>
          <Text style={styles.cardSubtitle}>{s.mapSearchRadius}</Text>
          <MapSearchRadiusSlider
            min={0}
            max={10}
            value={mileRadius}
            onValueChange={setMileRadius}
            unitLabel={s.mile}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
  },
  headerSpacer: {
    width: 32,
  },
  pressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitleNoMargin: {
    fontSize: 17,
    fontWeight: "700",
    color: c.white,
  },
  cardSubtitle: {
    fontSize: 13,
    color: c.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  radioRowWrap: {
    flexDirection: "row",
    gap: 24,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: c.white,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.white,
  },
  radioLabel: {
    fontSize: 16,
    color: c.white,
    fontWeight: "500",
  },
  radioColumn: {
    gap: 12,
  },
});
