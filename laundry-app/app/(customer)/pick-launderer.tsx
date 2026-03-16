import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { LAUNDERERS, type Launderer } from "@/constants/launderers";

const c = theme.colors;

const ONBOARDING_IMAGES: Record<"slide1" | "slide2" | "slide3", number> = {
  slide1: assets.onboarding.slide1,
  slide2: assets.onboarding.slide2,
  slide3: assets.onboarding.slide3,
};

function LaundererCard({
  launderer,
  onPress,
}: {
  launderer: Launderer;
  onPress: () => void;
}) {
  const imageSource = ONBOARDING_IMAGES[launderer.imageKey];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={imageSource} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <MaterialCommunityIcons
              key={i}
              name="star"
              size={16}
              color="#EAB308"
            />
          ))}
          <Text style={styles.ratingText}>({launderer.rating})</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {launderer.name}
        </Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="phone"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{launderer.phoneNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{launderer.openingHours}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{launderer.distance}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="home-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText} numberOfLines={2}>
            {launderer.address}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PickLaundererScreen() {
  const router = useRouter();
  const s = strings.customer.pickLaunderer;

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
        <View style={styles.addressWrap}>
          <Image
            source={assets.icons.location_icon}
            style={styles.addressIcon}
          />
          <TextInput
            placeholder={s.addressPlaceholder}
            placeholderTextColor={c.gray50}
            style={styles.addressInput}
            defaultValue="1465 5th Avenue APt 5C"
            editable
            returnKeyType="done"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.headerRight,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filter"
        >
          <Image
            source={assets.icons.menu_icon}
            style={styles.headerRightIcon}
          />
        </Pressable>
      </SafeAreaView>
      <Text style={styles.screenTitle}>{s.title}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {LAUNDERERS.map((launderer) => (
          <LaundererCard
            key={launderer.id}
            launderer={launderer}
            onPress={() =>
              router.push({
                pathname: "/(customer)/launderer-detail",
                params: { id: launderer.id },
              })
            }
          />
        ))}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: { padding: 6 },
  addressWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  addressIcon: {
    width: 20,
    height: 20,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: c.themeBlack,
    paddingVertical: 0,
  },
  headerRight: { padding: 8 },
  headerRightIcon: {
    width: 20,
    height: 20,
    tintColor: c.white,
  },
  pressed: { opacity: 0.8 },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: c.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: c.blue900,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  cardImage: {
    width: 100,
    height: 120,
    backgroundColor: c.blue500,
    borderRadius: 16,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: c.white,
    fontWeight: "600",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: c.white,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: c.white,
    opacity: 0.8,
    flex: 1,
  },
});
