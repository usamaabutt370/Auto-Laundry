import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";

const c = theme.colors;

const SERVICES = [
  {
    icon: "tshirt-crew-outline" as const,
    title: "Wash & Fold",
    description: "Everyday laundry washed by hand, dried, and neatly folded.",
  },
  {
    icon: "hanger" as const,
    title: "Dry Cleaning",
    description: "Delicate and formal wear cleaned with careful attention.",
  },
  {
    icon: "content-cut" as const,
    title: "Tailoring & Alterations",
    description: "Fixes and alterations from trusted local housewives.",
  },
];

/** "Our Services" — 3 core service offerings, matching real app order types. */
export function LandingServices() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        Our <Text style={styles.headingAccent}>Services</Text>
      </Text>

      <View style={styles.grid}>
        {SERVICES.map((service, i) => (
          <View key={service.title} style={styles.card}>
            <View style={[styles.iconWell, i === 1 && styles.iconWellAlt]}>
              <MaterialCommunityIcons
                name={service.icon}
                size={30}
                color={i === 1 ? c.background : c.white}
              />
            </View>
            <Text style={styles.cardTitle}>{service.title}</Text>
            <Text style={styles.cardDescription}>{service.description}</Text>
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
    backgroundColor: c.background,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: c.white,
    textAlign: "center",
    marginBottom: 36,
  },
  headingAccent: {
    color: c.outline,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  card: {
    width: 240,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  iconWell: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.blue900,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
  },
  iconWellAlt: {
    backgroundColor: c.white,
    borderColor: c.outline,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: c.white,
    marginBottom: 8,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 21,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
});
