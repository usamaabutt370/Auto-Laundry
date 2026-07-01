import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

const REASONS = [
  {
    number: "01",
    title: "Work From Home",
    description: "Run your laundry business from home, on your own terms.",
  },
  {
    number: "02",
    title: "Flexible Hours",
    description: "Accept orders around your day — no fixed shifts required.",
  },
  {
    number: "03",
    title: "Keep What You Earn",
    description: "Get paid per order, with earnings tracked in your dashboard.",
  },
];

/** "Why Women Choose Tap2Laundry" — the earning perks that matter most. */
export function LandingWhyChooseUs() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        Why Women Choose <Text style={styles.headingAccent}>Tap2Laundry</Text>
      </Text>

      <View style={styles.grid}>
        {REASONS.map((reason) => (
          <View key={reason.number} style={styles.card}>
            <Text style={styles.number}>{reason.number}</Text>
            <Text style={styles.cardTitle}>{reason.title}</Text>
            <Text style={styles.cardDescription}>{reason.description}</Text>
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
    width: 260,
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...theme.shadow,
  },
  number: {
    fontSize: 30,
    fontWeight: "800",
    color: c.outline,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.themeBlack,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 21,
    color: c.themeGray,
  },
});
