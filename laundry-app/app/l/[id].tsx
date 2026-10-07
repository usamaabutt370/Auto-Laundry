import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchPartnerDetail } from "@/lib/partner-discovery";
import { appStoreUrl, laundererShareUrl, playStoreUrl } from "@/lib/launderer-share-link";

function partnerIdFromParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default function LaundererShareLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const partnerId = partnerIdFromParam(params.id);
  const [name, setName] = useState("Laundry profile");

  useEffect(() => {
    if (!partnerId || Platform.OS === "web") return;
    router.replace({
      pathname: "/(customer)/launderer-detail",
      params: { id: partnerId },
    });
  }, [partnerId, router]);

  useEffect(() => {
    if (!partnerId || Platform.OS !== "web") return;
    let cancelled = false;
    void fetchPartnerDetail(partnerId).then(({ profile }) => {
      if (cancelled) return;
      const businessName = profile?.business_name?.trim();
      if (businessName) setName(businessName);
    });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  if (Platform.OS !== "web") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const iosStore = appStoreUrl();
  const androidStore = playStoreUrl(partnerId);
  const openInApp = () => {
    if (typeof window === "undefined" || !partnerId) return;
    window.location.href = `laundryapp://l/${partnerId}`;
  };

  return (
    <View style={styles.page}>
      <Text style={styles.brand}>Tap2Laundry</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.body}>
        Open this laundry profile in the Tap2Laundry app. If you do not have the app yet, download it and open this link again.
      </Text>
      <Pressable onPress={openInApp} style={styles.primary}>
        <Text style={styles.primaryText}>Open in the app</Text>
      </Pressable>
      {iosStore ? (
        <Pressable onPress={() => void Linking.openURL(iosStore)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Download on the App Store</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => void Linking.openURL(androidStore)} style={styles.secondary}>
        <Text style={styles.secondaryText}>Get it on Google Play</Text>
      </Pressable>
      <Text style={styles.link}>{laundererShareUrl(partnerId)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7FB" },
  page: {
    flex: 1,
    backgroundColor: "#F4F7FB",
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  brand: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  title: { fontSize: 28, fontWeight: "800", color: "#1B2559", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, color: "#64748B", textAlign: "center", maxWidth: 420 },
  primary: {
    marginTop: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 240,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 240,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryText: { color: "#1B2559", fontSize: 15, fontWeight: "700" },
  link: { marginTop: 8, fontSize: 12, color: "#94A3B8", textAlign: "center" },
});
