import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { assets } from "@/assets/assets";
import { Spacer } from "@/components";
import { strings } from "@/constants/strings";
import type { LaundererServiceType } from "@/constants/launderers";
import { theme } from "@/constants/theme";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  fetchPartnerDetail,
  serviceCategoriesToTypes,
} from "@/lib/partner-discovery";

const c = theme.colors;

const PLACEHOLDER_RATING = 4.5;
const DISTANCE_PLACEHOLDER = "—";

const SERVICE_KEYS: LaundererServiceType[] = [
  "washAndFold",
  "dryCleaning",
  "tailoring",
];

export default function LaundererDetailScreen() {
  const router = useRouter();
  const { setPartner } = useCustomerOrderDraft();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const partnerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const s = strings.customer.laundererDetail;
  const sServices = strings.customer.pickupServices;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof fetchPartnerDetail>
  >["profile"]>(null);
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof fetchPartnerDetail>>["services"]
  >([]);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      setProfile(null);
      setServices([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { profile: p, services: rows, error: err } = await fetchPartnerDetail(
      partnerId
    );
    if (err) setError(err);
    setProfile(p);
    setServices(rows);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceTypes = useMemo(
    () =>
      serviceCategoriesToTypes(
        services.map((row) => row.category).filter(Boolean) as string[]
      ),
    [services]
  );

  const heroUri = avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);

  const handleSelect = () => {
    if (partnerId) {
      setPartner(partnerId, profile?.business_name?.trim() || null);
    }
    router.push("/(customer)/pickup-services");
  };

  if (!partnerId) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header} edges={["top"]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
        </SafeAreaView>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Launderer not found</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header} edges={["top"]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
          <View style={styles.headerRight} />
        </SafeAreaView>
        <View style={styles.centered}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header} edges={["top"]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{s.title}</Text>
          <View style={styles.headerRight} />
        </SafeAreaView>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>
            {error ?? "Launderer not found"}
          </Text>
          <Pressable onPress={load} style={styles.retryWrap}>
            <Text style={styles.retryText}>{strings.customer.pickLaunderer.retry}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hoursDetail =
    profile.available_time?.trim() ||
    strings.customer.pickLaunderer.hoursPlaceholder;

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
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {heroUri ? (
          <Image source={{ uri: heroUri }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <Image
            source={assets.onboarding.slide2}
            style={styles.heroImage}
            contentFit="cover"
          />
        )}
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
            <Text style={styles.ratingText}>({PLACEHOLDER_RATING})</Text>
            <MaterialCommunityIcons
              name="compass-outline"
              size={18}
              color={c.white}
              style={styles.compassIcon}
              opacity={0.7}
            />
            <Text style={styles.distanceText}>{DISTANCE_PLACEHOLDER}</Text>
          </View>
          <Text style={styles.name}>{profile.business_name.trim()}</Text>
          {profile.business_description?.trim() ? (
            <Text style={styles.description}>{profile.business_description.trim()}</Text>
          ) : null}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>{hoursDetail}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              {profile.phone_number?.trim() || "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="home-outline"
              size={20}
              color={c.white}
              opacity={0.7}
            />
            <Text style={styles.detailText}>
              {profile.address?.trim() || "—"}
            </Text>
          </View>
          {profile.pickup_delivery_enabled &&
          profile.pickup_delivery_amount?.trim() ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={20}
                color={c.white}
                opacity={0.7}
              />
              <Text style={styles.detailText}>
                {`${strings.customer.partnerPickupLinePrefix} ${profile.pickup_delivery_amount.trim()}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.servicesRow}>
            {SERVICE_KEYS.filter((k) => serviceTypes.includes(k)).map((key) => (
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
    flex: 1,
    textAlign: "center",
  },
  headerRight: { padding: 8, width: 40 },
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
    resizeMode: "cover",
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
    marginBottom: 8,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    color: c.white,
    opacity: 0.75,
    marginBottom: 12,
    lineHeight: 20,
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
    paddingHorizontal: 24,
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: c.white,
    textAlign: "center",
  },
  retryWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: c.lightBlue,
    fontSize: 15,
    fontWeight: "600",
  },
});
