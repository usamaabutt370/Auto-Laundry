import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  fetchPickupPartners,
  type PartnerPublicRow,
} from "@/lib/partner-discovery";

const c = theme.colors;

const PLACEHOLDER_RATING = 4.5;
const DISTANCE_PLACEHOLDER = "—";

function LaundererCard({
  partner,
  onPress,
}: {
  partner: PartnerPublicRow;
  onPress: () => void;
}) {
  const imageUri = avatarUrlWithCacheBuster(partner.image_url, partner.updated_at);
  const hours =
    partner.available_time?.trim() || strings.customer.pickLaunderer.hoursPlaceholder;
  const phone = partner.phone_number?.trim() || "—";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <Image source={assets.onboarding.slide1} style={styles.cardImage} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <MaterialCommunityIcons key={i} name="star" size={16} color="#EAB308" />
          ))}
          <Text style={styles.ratingText}>({PLACEHOLDER_RATING})</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {partner.business_name.trim()}
        </Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="phone"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{hours}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText}>{DISTANCE_PLACEHOLDER}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="home-outline"
            size={16}
            color={c.white}
            opacity={0.5}
          />
          <Text style={styles.infoText} numberOfLines={2}>
            {partner.address?.trim() || "—"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PickLaundererScreen() {
  const router = useRouter();
  const s = strings.customer.pickLaunderer;
  const [partners, setPartners] = useState<PartnerPublicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchPickupPartners();
    if (err) {
      setError(err);
      setPartners([]);
    } else {
      setPartners(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <Image source={assets.icons.location_icon} style={styles.addressIcon} />
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
          style={({ pressed }) => [styles.headerRight, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Filter"
        >
          <Image source={assets.icons.menu_icon} style={styles.headerRightIcon} />
        </Pressable>
      </SafeAreaView>
      <Text style={styles.screenTitle}>{s.title}</Text>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : error ? (
        <View style={styles.centerBlock}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{s.retry}</Text>
          </Pressable>
        </View>
      ) : partners.length === 0 ? (
        <View style={styles.centerBlock}>
          <Text style={styles.emptyText}>{s.emptyList}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {partners.map((partner) => (
            <LaundererCard
              key={partner.id}
              partner={partner}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/launderer-detail",
                  params: { id: partner.id },
                })
              }
            />
          ))}
        </ScrollView>
      )}
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
  centerBlock: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#FFB3B3",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    color: c.blue500,
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
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
