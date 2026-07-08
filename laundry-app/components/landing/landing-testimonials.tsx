import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

/** Sample quotes — replace with real customer and Captain stories once available. */
const TESTIMONIALS = [
  {
    initials: "F.A.",
    quote:
      "My last launderer shrank two of my shirts. Since switching, every order comes back exactly how I sent it.",
    role: "Customer",
  },
  {
    initials: "N.S.",
    quote:
      "You can tell it's washed by hand, not thrown in some rough commercial machine. My clothes have never looked better.",
    role: "Customer",
  },
  {
    initials: "R.H.",
    quote:
      "I set my own hours around my family and still earn steady income as a Laundry Captain — tracked right in my dashboard.",
    role: "Laundry Captain",
  },
];

/** "Testimonials" — sample customer and Laundry Captain stories (initials-only avatars, no fabricated identities). */
export function LandingTestimonials() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>What People Are Saying</Text>

      <View style={styles.grid}>
        {TESTIMONIALS.map((t) => (
          <View key={t.initials} style={styles.card}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <MaterialCommunityIcons key={i} name="star" size={16} color={c.background} />
              ))}
            </View>
            <Text style={styles.quote}>&ldquo;{t.quote}&rdquo;</Text>
            <View style={styles.attribution}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{t.initials}</Text>
              </View>
              <Text style={styles.name}>{t.role}</Text>
            </View>
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
    backgroundColor: c.white,
  },
  heading: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    color: c.themeBlack,
    textAlign: "center",
    marginBottom: 36,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  card: {
    width: 300,
    borderRadius: 16,
    padding: 22,
    backgroundColor: c.themeWhite,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 12,
  },
  quote: {
    fontSize: 18,
    lineHeight: 28,
    color: c.themeBlack,
    marginBottom: 16,
  },
  attribution: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.white,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: c.themeBlack,
  },
});
