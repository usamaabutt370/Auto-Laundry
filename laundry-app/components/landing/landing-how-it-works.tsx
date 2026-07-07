import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

const STEPS = [
  {
    icon: "calendar-clock" as const,
    title: "Schedule a Pickup",
    description: "Pick a date and time that works for you, right from the app.",
    background: c.background,
  },
  {
    icon: "hand-heart-outline" as const,
    title: "A Housewife Collects It",
    description: "A trained, vetted housewife near you picks up your laundry.",
    background: c.blue900,
  },
  {
    icon: "washing-machine" as const,
    title: "Washed With Care",
    description: "No rough machines — cleaned by hand, gently, like her own.",
    background: c.backgroundDark,
  },
  {
    icon: "package-variant-closed" as const,
    title: "Delivered Back",
    description: "Fresh, folded laundry delivered right back to your door.",
    background: c.blue900,
  },
];

/** "How It Works" — the customer's pickup-to-delivery journey. */
export function LandingHowItWorks() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        How It <Text style={styles.headingAccent}>Works</Text>
      </Text>

      <View style={styles.grid}>
        {STEPS.map((step, i) => (
          <View key={step.title} style={[styles.card, { backgroundColor: step.background }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{i + 1}</Text>
            </View>
            <MaterialCommunityIcons name={step.icon} size={32} color={c.white} />
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Text style={styles.cardDescription}>{step.description}</Text>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  card: {
    width: 230,
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: c.white,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.white,
    marginTop: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.85)",
  },
});
