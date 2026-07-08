import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { theme } from "@/constants/theme";

const c = theme.colors;

const SERVICES = [
  {
    image: assets.onboarding.slide3,
    tag: "Most Popular",
    title: "Wash & Fold",
    description: "Washed by hand, dried, and neatly folded by a trusted housewife near you.",
  },
  {
    image: assets.images.schedule_pickup,
    tag: "Free Pickup",
    title: "Pickup & Delivery",
    description: "We collect from your door and return fresh, clean clothes — no drop-off needed.",
  },
  {
    image: assets.images.top_facilities,
    tag: "Expert Hands",
    title: "Ironing & Care",
    description: "Crisp, wrinkle-free results from skilled Laundry Captains who take pride in every garment.",
  },
];

export function LandingServices() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        Our <Text style={styles.headingAccent}>Services</Text>
      </Text>
      <Text style={styles.subheading}>
        Everything your wardrobe needs, handled with care.
      </Text>

      <View style={styles.grid}>
        {SERVICES.map((service) => (
          <View key={service.title} style={styles.card}>
            <View style={styles.imageWrap}>
              <Image source={service.image} style={styles.image} contentFit="contain" />
              <View style={styles.tag}>
                <Text style={styles.tagText}>{service.tag}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{service.title}</Text>
              <Text style={styles.cardDescription}>{service.description}</Text>
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
    paddingVertical: 64,
    backgroundColor: c.themeWhite,
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
    maxWidth: 440,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
  },
  card: {
    width: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    ...theme.shadow,
  },
  imageWrap: {
    height: 200,
    backgroundColor: "rgba(20,83,107,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  tag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: c.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.white,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 22,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.themeBlack,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: c.themeBlack,
  },
});
