import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

const STEPS = [
  {
    icon: "account-check-outline" as const,
    title: "Sign Up & Get Verified",
    description: "Create your Laundry Captain profile in minutes, from home.",
    background: c.background,
  },
  {
    icon: "calendar-clock" as const,
    title: "Set Your Hours",
    description: "Choose the services you offer and the hours that suit you.",
    background: c.blue900,
  },
  {
    icon: "bell-ring-outline" as const,
    title: "Receive Nearby Orders",
    description: "Get matched with customers near home who need laundry care.",
    background: c.backgroundDark,
  },
  {
    icon: "cash-multiple" as const,
    title: "Clean, Deliver & Earn",
    description: "Complete the order and get paid — tracked in your dashboard.",
    background: c.blue900,
  },
];

/** "How It Works" — a Laundry Captain's path from sign-up to earning. */
export function LandingHowItWorks() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        How You Start <Text style={styles.headingAccent}>Earning</Text>
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
