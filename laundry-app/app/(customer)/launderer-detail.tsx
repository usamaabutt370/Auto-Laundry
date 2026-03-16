import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import {
  getLaundererById,
  type LaundererServiceType,
} from "@/constants/launderers";
import { Spacer } from "@/components";

const c = theme.colors;

const ONBOARDING_IMAGES: Record<"slide1" | "slide2" | "slide3", number> = {
  slide1: assets.onboarding.slide1,
  slide2: assets.onboarding.slide2,
  slide3: assets.onboarding.slide3,
};

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
];

export default function LaundererDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const launderer = getLaundererById(params.id ?? "");
  const s = strings.customer.laundererDetail;
  const sServices = strings.customer.pickupServices;

  if (!launderer) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header} edges={["top"]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={c.white}
            />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
        </SafeAreaView>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Launderer not found</Text>
        </View>
      </View>
    );
  }

  const heroSource = ONBOARDING_IMAGES[launderer.heroImageKey];

  const handleSelect = () => {
    router.push("/(customer)/pickup-services");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{s.title}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.headerRight,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Options"
        >
          <Image
            source={assets.icons.menu_icon}
            style={styles.headerRightIcon}
          />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image source={heroSource} style={styles.heroImage} />
        <Spacer.Column numberOfSpaces={2} />
        <View style={styles.infoBlock}>
          <View style={styles.ratingDistanceRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MaterialCommunityIcons
                key={i}
                name="star"
                size={18}
                color="#EAB308"
              />
            ))}
            <Text style={styles.ratingText}>({launderer.rating})</Text>
            <MaterialCommunityIcons
              name="compass-outline"
              size={18}
              color={c.white}
              style={styles.compassIcon}
              opacity={0.7}
            />
            <Text style={styles.distanceText}>{launderer.distance}</Text>
          </View>
          <Text style={styles.name}>{launderer.name}</Text>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              {launderer.openingHoursDetail}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>{launderer.phoneNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="home-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>{launderer.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="cash"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              $ {launderer.pricePerPound.toFixed(2)} {s.perPound}
            </Text>
          </View>

          <View style={styles.servicesRow}>
            {SERVICE_KEYS.filter((k) =>
              launderer.servicesOffered.includes(k),
            ).map((key) => (
              <View key={key} style={styles.servicePill}>
                <Text style={styles.servicePillText}>{sServices[key]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={["bottom"]}>
        <Pressable
          onPress={handleSelect}
          style={({ pressed }) => [styles.selectBtn, pressed && styles.pressed]}
        >
          <Text style={styles.selectLabel}>{s.select}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    color: c.white,
    fontWeight: "700",
  },
  headerRight: { padding: 8 },
  headerRightIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  heroImage: {
    height: 200,
    marginTop: 8,
    width: "100%",
    borderRadius: 16,
    resizeMode: "contain",
    backgroundColor: c.blue900,
  },
  infoBlock: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.blue900,
  },
  ratingDistanceRow: {
    gap: 6,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
  },
  compassIcon: { marginLeft: 12 },
  distanceText: {
    fontSize: 16,
    marginLeft: 4,
    color: c.white,
    opacity: 0.5,
  },
  name: {
    fontSize: 22,
    color: c.white,
    marginBottom: 16,
    fontWeight: "700",
  },
  detailRow: {
    gap: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: c.white,
    opacity: 0.7,
  },
  servicesRow: {
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
    flexDirection: "row",
  },
  servicePill: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    borderColor: c.white,
    paddingHorizontal: 16,
  },
  servicePillText: {
    fontSize: 14,
    color: c.white,
    fontWeight: "600",
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: c.background,
  },
  selectBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.backgroundLight,
  },
  selectLabel: {
    fontSize: 17,
    color: c.white,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: c.white,
  },
});
