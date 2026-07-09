import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

const STEPS = [
  {
    number: "01",
    icon: "calendar-clock" as const,
    title: "Order Online or From Our App",
    description: "Pick a date and time that works for you, right from the app.",
  },
  {
    number: "02",
    icon: "truck-fast-outline" as const,
    title: "We Collect at a Time That Suits You",
    description: "A trained, vetted Laundry Captain near you picks up your laundry.",
  },
  {
    number: "03",
    icon: "washing-machine" as const,
    title: "We Work Our Magic",
    description: "No rough machines — cleaned by hand, gently, like her own.",
  },
  {
    number: "04",
    icon: "package-variant-closed" as const,
    title: "We Return Your Clean Clothes",
    description: "Fresh, folded laundry delivered right back to your door.",
  },
];

export function LandingHowItWorks() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        How It <Text style={styles.headingAccent}>Works</Text>
      </Text>
      <Text style={styles.subheading}>
        Four simple steps from your door to clean clothes and back.
      </Text>

      <View style={styles.grid}>
        {STEPS.map((step) => (
          <LinearGradient
            key={step.number}
            colors={["#071828", "#0f3040", "#1a5060"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.number}>{step.number}</Text>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name={step.icon} size={28} color={c.white} />
            </View>
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Text style={styles.cardDescription}>{step.description}</Text>
          </LinearGradient>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [pressed && styles.pressed]}
        onPress={() => router.push("/(auth)/sign-up")}
        accessibilityRole="button"
        accessibilityLabel="Book Your Pickup"
      >
        <LinearGradient
          colors={["#f9c74f", "#f4a124"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaBtnText}>Book Your Pickup</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    backgroundColor: c.white,
    alignItems: "center",
  },
  heading: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    color: c.themeBlack,
    textAlign: "center",
    marginBottom: 12,
  },
  headingAccent: {
    color: c.background,
  },
  subheading: {
    fontSize: 18,
    lineHeight: 28,
    color: c.themeBlack,
    textAlign: "center",
    marginBottom: 48,
    maxWidth: 480,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    marginBottom: 48,
  },
  card: {
    width: 240,
    alignItems: "center",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...theme.shadow,
  },
  number: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "800",
    color: c.white,
    marginBottom: 16,
    opacity: 0.2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.primaryTintSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  ctaBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  pressed: {
    opacity: 0.85,
  },
});
