import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;

const REASONS = [
  {
    number: "01",
    title: "Gentle, Careful Handling",
    description: "Washed by hand, not rough machines — your clothes stay safe.",
  },
  {
    number: "02",
    title: "Trusted, Vetted Housewives",
    description: "Every Laundry Captain is verified before taking your order.",
  },
  {
    number: "03",
    title: "Live Order Tracking",
    description: "Follow your laundry from pickup to clean-up to delivery.",
  },
];

/** "Why Choose Us" — 3 reasons customers trust Tap2Laundry over commercial launderers. */
export function LandingWhyChooseUs() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        Why Choose <Text style={styles.headingAccent}>Us</Text>
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
