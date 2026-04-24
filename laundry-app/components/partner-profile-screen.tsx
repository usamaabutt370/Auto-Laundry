import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { getStrings } from "@/locales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";

const c = theme.colors;
const fs = theme.fontSize;
const AVATAR_BUCKET = "avatars";
/** Distinct from user avatar path (`avatar.jpg`) so customer and partner images never overwrite each other. */
const PARTNER_AVATAR_PREFIX = "partner_avatar";

/** Core business + pickup fields from `partner_profiles` (always query these together). */
type PartnerProfileCoreRow = {
  business_name: string | null;
  business_description: string | null;
  phone_number: string | null;
  available_time: string | null;
  address: string | null;
  pickup_delivery_enabled: boolean | null;
  pickup_delivery_amount: string | null;
  updated_at: string | null;
};

type PartnerProfileRow = PartnerProfileCoreRow & {
  image_url: string | null;
};

type PartnerServiceRow = {
  name: string;
  price_display: string;
  category: string | null;
};

export function PartnerProfileScreen() {
  const router = useRouter();
  const { user, refreshRole } = useAuth();
  const { locale } = useLocale();
  const sDashboard = getStrings(locale).partner.dashboard;
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfileRow | null>(null);
  const [services, setServices] = useState<PartnerServiceRow[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        { data: pData },
        partnerCoreRes,
        partnerImageRes,
        { data: serviceData },
        creditAccountRes,
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string | null }>(),
        supabase
          .from("partner_profiles")
          .select(
            "business_name,business_description,phone_number,available_time,address,pickup_delivery_enabled,pickup_delivery_amount,updated_at"
          )
          .eq("id", user.id)
          .maybeSingle<PartnerProfileCoreRow>(),
        // Separate select: if `image_url` is missing on the DB, this fails alone and we still show business details.
        supabase
          .from("partner_profiles")
          .select("image_url")
          .eq("id", user.id)
          .maybeSingle<{ image_url: string | null }>(),
        supabase
          .from("partner_services")
          .select("name,price_display,category")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("partner_credit_accounts")
          .select("balance")
          .eq("partner_id", user.id)
          .maybeSingle<{ balance: number }>(),
      ]);
      setProfileRole(pData?.role ?? null);
      const core = partnerCoreRes.data;
      const imageUrl =
        !partnerImageRes.error && partnerImageRes.data != null
          ? partnerImageRes.data.image_url
          : null;
      setPartnerProfile(
        core ? { ...core, image_url: imageUrl } : null
      );
      setServices((serviceData ?? []) as PartnerServiceRow[]);
      setTokenBalance(Number(creditAccountRes.data?.balance ?? 0));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedServices = useMemo(() => {
    const map = new Map<string, PartnerServiceRow[]>();
    services.forEach((service) => {
      const key = service.category?.trim() || "Other";
      const prev = map.get(key) ?? [];
      prev.push(service);
      map.set(key, prev);
    });
    return Array.from(map.entries());
  }, [services]);

  const pickAndUploadImage = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to upload a profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    const lower = uri.toLowerCase();
    const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    const ext = isJpeg ? "jpg" : "png";
    const contentType = isJpeg ? "image/jpeg" : "image/png";

    setUploadingImage(true);
    try {
      const path = `${user.id}/${PARTNER_AVATAR_PREFIX}.${ext}`;
      const file = new FileSystem.File(uri);
      const buffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, buffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from("partner_profiles").upsert(
        {
          id: user.id,
          image_url: publicUrl,
          updated_at: now,
        },
        { onConflict: "id" }
      );
      if (updateError) throw updateError;
      await loadData();
      Alert.alert("Success", "Profile image updated successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not upload image.";
      Alert.alert("Upload failed", msg);
    } finally {
      setUploadingImage(false);
    }
  }, [user?.id, loadData]);

  const handleRoleToggle = useCallback(
    async (value: boolean) => {
      if (!isSupabaseConfigured() || !supabase || !user?.id || updatingRole) return;
      setUpdatingRole(true);
      try {
        const newRole: UserRole = value ? "launderer" : "customer";
        const { error } = await supabase
          .from("profiles")
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw error;
        await refreshRole();
        router.replace(value ? "/(partner)" : "/(customer)");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not update role.";
        Alert.alert("Error", msg);
      } finally {
        setUpdatingRole(false);
      }
    },
    [refreshRole, router, updatingRole, user?.id]
  );

  const partnerImageUri = avatarUrlWithCacheBuster(
    partnerProfile?.image_url,
    partnerProfile?.updated_at
  );
  const roleOn = (profileRole ?? "customer") === "launderer";

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(partner)");
    }
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader
          title="Launderer Profile"
          leftIcon="arrow-left"
          onLeftPress={handleBack}
          leftAccessibilityLabel="Back"
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader
        title="Launderer Profile"
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        leftAccessibilityLabel="Back"
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable style={styles.avatarWrap} onPress={pickAndUploadImage} disabled={uploadingImage}>
          {partnerImageUri ? (
            <Image source={{ uri: partnerImageUri }} style={styles.avatar} />
          ) : (
            <Image source={assets.images.profile_placeholder} style={styles.avatar} />
          )}
          {uploadingImage ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={c.white} size="small" />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.section}>{sDashboard.tokenBalance}</Text>
          <Text style={styles.tokenValue}>
            {tokenBalance} {sDashboard.tokensUnit}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Business details</Text>
          <Text style={styles.rowLabel}>Business name</Text>
          <Text style={styles.rowValue}>{partnerProfile?.business_name || "-"}</Text>
          <Text style={styles.rowLabel}>Description</Text>
          <Text style={styles.rowValue}>{partnerProfile?.business_description || "-"}</Text>
          <Text style={styles.rowLabel}>Phone</Text>
          <Text style={styles.rowValue}>{partnerProfile?.phone_number || "-"}</Text>
          <Text style={styles.rowLabel}>Available time</Text>
          <Text style={styles.rowValue}>{partnerProfile?.available_time || "-"}</Text>
          <Text style={styles.rowLabel}>Address</Text>
          <Text style={styles.rowValue}>{partnerProfile?.address || "-"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Services</Text>
          {groupedServices.length === 0 ? (
            <Text style={styles.rowValue}>No services added yet.</Text>
          ) : (
            groupedServices.map(([category, rows]) => (
              <View key={category} style={styles.group}>
                <Text style={styles.groupTitle}>{category}</Text>
                {rows.map((row, idx) => (
                  <Text key={`${category}-${idx}`} style={styles.rowValue}>
                    {row.name} - {row.price_display}
                  </Text>
                ))}
              </View>
            ))
          )}
          <Text style={styles.rowLabel}>Pickup & delivery</Text>
          <Text style={styles.rowValue}>
            {partnerProfile?.pickup_delivery_enabled
              ? `Enabled (${partnerProfile?.pickup_delivery_amount || "-"})`
              : "Disabled"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.roleRow}>
            <Text style={styles.section}>Use app as launderer</Text>
            <Switch
              value={roleOn}
              onValueChange={handleRoleToggle}
              disabled={updatingRole}
              trackColor={{ false: c.blue900, true: c.blue500 }}
              thumbColor={c.white}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: "hidden",
    alignSelf: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: c.outline,
  },
  avatar: { width: "100%", height: "100%" },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.outline,
    padding: 16,
    marginBottom: 14,
  },
  section: { color: c.white, fontSize: fs.smallTitle, fontWeight: "700", marginBottom: 10 },
  tokenValue: { color: c.white, fontSize: fs.titleMedium, fontWeight: "700" },
  rowLabel: { color: c.blue500, fontSize: fs.descText, marginTop: 6 },
  rowValue: { color: c.white, fontSize: fs.smallText },
  group: { marginBottom: 8 },
  groupTitle: { color: c.white, fontSize: fs.smallText, fontWeight: "600", marginBottom: 4 },
  roleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

