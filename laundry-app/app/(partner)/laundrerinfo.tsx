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
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
const PARTNER_AVATAR_PREFIX = "partner_avatar";

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

export default function LaundrerInfo() {
  const router = useRouter();
  const navigation = useNavigation();
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <AppHeader
          title="Launderer Profile"
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}

        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Pressable style={styles.avatarWrap} onPress={pickAndUploadImage} disabled={uploadingImage}>
            <Image
              source={partnerImageUri ? { uri: partnerImageUri } : assets.images.profile_placeholder}
              style={styles.avatar}
              resizeMode="cover"
            />
            {uploadingImage ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color={c.white} size="small" />
              </View>
            ) : null}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.white} size="small" />
          </View>
        ) : (
          <>
            <View style={styles.detailsCard}>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>{sDashboard.tokenBalance}</Text>
                <Text style={styles.detailValue}>
                  {tokenBalance} {sDashboard.tokensUnit}
                </Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Business Name</Text>
                <Text style={styles.detailValue}>{partnerProfile?.business_name || "-"}</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{partnerProfile?.business_description || "-"}</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{partnerProfile?.phone_number || "-"}</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Available Time</Text>
                <Text style={styles.detailValue}>{partnerProfile?.available_time || "-"}</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{partnerProfile?.address || "-"}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Services</Text>
              {groupedServices.length === 0 ? (
                <Text style={styles.detailValue}>No services added yet.</Text>
              ) : (
                groupedServices.map(([category, rows]) => (
                  <View key={category} style={styles.serviceGroup}>
                    <Text style={styles.serviceCategory}>{category}</Text>
                    {rows.map((row, idx) => (
                      <Text key={`${category}-${idx}`} style={styles.serviceItem}>
                        {row.name} - {row.price_display}
                      </Text>
                    ))}
                  </View>
                ))
              )}

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Pickup & Delivery</Text>
                <Text style={styles.detailValue}>
                  {partnerProfile?.pickup_delivery_enabled
                    ? `Enabled (${partnerProfile?.pickup_delivery_amount || "-"})`
                    : "Disabled"}
                </Text>
              </View>
            </View>


          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  safeTop: { paddingHorizontal: 24, paddingBottom: 8 },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  editBtnHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  editLabel: { fontSize: 14, color: c.blue500, fontWeight: "500" },
  editLabelWhite: { color: c.white },
  headerSection: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: c.blue900,
    borderWidth: 2,
    borderColor: c.blue600,
    position: "relative"
  },
  avatar: { width: "100%", height: "100%" },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  detailsCard: { paddingVertical: 24, paddingHorizontal: 20, borderRadius: 16, backgroundColor: c.blue900, marginBottom: 20, gap: 16 },
  detailBlock: { gap: 4 },
  detailLabel: { fontSize: 13, color: c.blue500, marginBottom: 2 },
  detailValue: { fontSize: 16, color: c.white, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: c.white, marginBottom: 8 },
  serviceGroup: { marginBottom: 12 },
  serviceCategory: { fontSize: 14, color: c.blue500, fontWeight: "600", marginBottom: 4 },
  serviceItem: { fontSize: 15, color: c.white, marginLeft: 8 },
  roleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleLabel: { fontSize: 17, color: c.white, fontWeight: "700", flex: 1 },
  switchWrap: { transform: [{ scale: 1.12 }] },
  roleHint: { fontSize: 13, color: c.blue500, lineHeight: 18, marginTop: 4 },
});
