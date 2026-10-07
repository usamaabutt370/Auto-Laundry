import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import { AppCtaButton } from "@/components/ui/cta-button";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  useMerchantServices,
  type ServicePricing,
  type ServicePricingKey,
} from "@/contexts/merchant-services-context";
import { shareLaundererProfile } from "@/lib/launderer-share-link";
import { getStrings } from "@/locales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getPartnerHoursRange, getPartnerOpenStatus } from "@/utils/partner-hours";
import { parsePriceDisplay } from "@/utils/parse-price-display";

const NAVY = "#1B2559";
const MUTED = "#8B95A7";
const BUSINESS_IMAGES_BUCKET = "business-images";

type ServiceKey = ServicePricingKey;

const SERVICE_ORDER: ServiceKey[] = ["washAndFold", "dryCleaning", "press", "tailoring"];

const SERVICE_VISUAL: Record<
  ServiceKey,
  { icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; color: string; tint: string }
> = {
  washAndFold: { icon: "basket-outline", color: "#2563EB", tint: "#EFF6FF" },
  dryCleaning: { icon: "hanger", color: "#7C3AED", tint: "#F5F3FF" },
  press: { icon: "iron", color: "#F59E0B", tint: "#FFF7ED" },
  tailoring: { icon: "scissors-cutting", color: "#E11D48", tint: "#FFF1F2" },
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function firstImage(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const found = raw.find((item): item is string => typeof item === "string" && item.trim().length > 0);
  return found?.trim() ?? null;
}

function imageList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function shortPlace(address: string): string {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) return parts.slice(-2).join(", ");
  return address;
}

function lowestAmount(pricing: ServicePricing | null): number | null {
  let min: number | null = null;
  for (const row of pricing?.rows ?? []) {
    const amount = parsePriceDisplay(row.value);
    if (amount == null || amount <= 0) continue;
    if (min == null || amount < min) min = amount;
  }
  return min;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount));
}

async function uploadCover(userId: string, uri: string): Promise<string> {
  let bytes: ArrayBuffer;
  let contentType: string;
  let ext: string;
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    bytes = await response.arrayBuffer();
    const mime = (response.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    contentType = mime;
    ext = mime === "image/png" ? "png" : "jpg";
  } else {
    const lower = uri.toLowerCase();
    const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    ext = isJpeg ? "jpg" : "png";
    contentType = isJpeg ? "image/jpeg" : "image/png";
    const file = new FileSystem.File(uri);
    bytes = await file.arrayBuffer();
  }
  const path = `${userId}/${Date.now()}-cover.${ext}`;
  const { error } = await supabase.storage
    .from(BUSINESS_IMAGES_BUCKET)
    .upload(path, bytes, { upsert: true, contentType });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUSINESS_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function PartnerStoreManagement({ onEditDetails }: { onEditDetails: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const copy = getStrings(locale).partner.storeManagement;
  const { user } = useAuth();
  const {
    washAndFoldPricing,
    dryCleaningPricing,
    pressPricing,
    tailoringPricing,
    refreshServices,
  } = useMerchantServices();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [address, setAddress] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;
    const [{ data }, ratingResult] = await Promise.all([
      supabase
        .from("partner_profiles")
        .select("business_name, business_description, phone_number, available_time, address, business_images")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("partner_rating_stats", { partner_ids: [user.id] }),
    ]);
    if (data) {
      setHasProfile(true);
      setBusinessName((data.business_name ?? "").trim());
      setDescription((data.business_description ?? "").trim());
      setPhone((data.phone_number ?? "").trim());
      setHours((data.available_time ?? "").trim());
      setAddress((data.address ?? "").trim());
      setImages(imageList(data.business_images));
    } else {
      setHasProfile(false);
    }
    const ratingRow = ((ratingResult.data ?? []) as Array<{
      avg_rating?: number | string;
      review_count?: number;
    }>)[0];
    const count = Number(ratingRow?.review_count) || 0;
    const avg = Number(ratingRow?.avg_rating);
    setRatingCount(count);
    setRatingAvg(count > 0 && Number.isFinite(avg) ? avg : null);
    await refreshServices();
  }, [refreshServices, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openBusinessDetails = onEditDetails;

  const openService = (key: ServiceKey) => {
    setPickerOpen(false);
    router.push({
      pathname: "/(partner)/onboarding/service-other",
      params: { service: key },
    });
  };

  const changeCover = async () => {
    if (!user?.id || !isSupabaseConfigured() || !supabase || uploadingCover) return;
    if (!hasProfile) {
      showAppAlert(copy.businessDetails, copy.missingProfile);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(copy.coverPermissionTitle, copy.coverPermissionMessage);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    const uri = result.canceled ? null : result.assets?.[0]?.uri;
    if (!uri) return;
    setUploadingCover(true);
    try {
      const url = await uploadCover(user.id, uri);
      const next = [url, ...images.filter((item) => item !== url)].slice(0, 10);
      const { error } = await supabase
        .from("partner_profiles")
        .update({ business_images: next, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      setImages(next);
    } catch {
      showAppAlert("Error", copy.coverError);
    } finally {
      setUploadingCover(false);
    }
  };

  const pricingByKey: Record<ServiceKey, ServicePricing | null> = {
    washAndFold: washAndFoldPricing,
    dryCleaning: dryCleaningPricing,
    press: pressPricing,
    tailoring: tailoringPricing,
  };

  const serviceLabel = (key: ServiceKey) => {
    if (key === "washAndFold") return copy.washFold;
    if (key === "dryCleaning") return copy.dryCleaning;
    if (key === "press") return copy.ironing;
    return copy.tailoring;
  };

  const openStatus = getPartnerOpenStatus(hours);
  const hoursLabel = getPartnerHoursRange(hours)?.rangeLabel || "";
  const coverUri = firstImage(images);
  const placeLabel = address ? shortPlace(address) : "";
  const ratingLabel =
    ratingAvg == null
      ? copy.noReviews
      : `${Number.isInteger(ratingAvg) ? String(ratingAvg) : ratingAvg.toFixed(1)} ${
          ratingCount === 1 ? copy.reviewsCountOne : fill(copy.reviewsCount, { count: ratingCount })
        }`;
  const displayName = businessName || copy.notSet;

  const shareStore = async () => {
    if (!user?.id) return;
    try {
      await shareLaundererProfile(user.id, displayName);
    } catch {
      showAppAlert(copy.share, copy.shareError);
    }
  };

  const serviceRows = useMemo(
    () =>
      SERVICE_ORDER.map((key) => {
        const pricing = pricingByKey[key];
        const count = pricing?.rows.length ?? 0;
        const amount = lowestAmount(pricing);
        return { key, count, amount };
      }),
    [dryCleaningPricing, pressPricing, tailoringPricing, washAndFoldPricing],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={NAVY} />
        </Pressable>
				<View style={styles.headerText}>
					<Text style={styles.headerTitle}>{copy.title}</Text>
					<Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
				</View>
				<Pressable
					onPress={() => void shareStore()}
					style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
					accessibilityRole="button"
					accessibilityLabel={copy.share}
				>
					<MaterialCommunityIcons name="share-variant" size={22} color={NAVY} />
				</Pressable>
			</View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.coverWrap}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#DBEAFE", "#EDE9FE"]} style={styles.cover} />
            )}
            <Pressable
              onPress={() => void changeCover()}
              style={({ pressed }) => [styles.coverBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={copy.changeCover}
            >
              {uploadingCover ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <MaterialCommunityIcons name="camera-outline" size={16} color="#2563EB" />
              )}
              <Text style={styles.coverBtnText}>{copy.changeCover}</Text>
            </Pressable>
          </View>

          <View style={styles.identity}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="washing-machine" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.identityBody}>
              <View style={styles.nameRow}>
                <Text style={styles.storeName} numberOfLines={1}>{displayName}</Text>
                <Pressable
                  onPress={openBusinessDetails}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.edit}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#93A0B8" />
                </Pressable>
              </View>
              <Pressable
                onPress={openBusinessDetails}
                style={({ pressed }) => [styles.statusPill, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.statusDot,
                    openStatus === "closed" && styles.statusDotClosed,
                    openStatus === "unknown" && styles.statusDotUnknown,
                  ]}
                />
                <Text style={styles.statusText}>
                  {openStatus === "open" ? copy.openNow : openStatus === "closed" ? copy.closed : copy.setHours}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={14} color="#16A34A" />
              </Pressable>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="star" size={14} color="#F5B301" />
                <Text style={styles.metaText} numberOfLines={1}>{ratingLabel}</Text>
                {placeLabel ? (
                  <>
                    <Text style={styles.metaDivider}>|</Text>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#7C3AED" />
                    <Text style={styles.metaText} numberOfLines={1}>{placeLabel}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={openBusinessDetails}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={copy.businessDetails}
        >
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#EFF6FF" }]}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>{copy.businessDetails}</Text>
              <Text style={styles.sectionHint}>{copy.businessDetailsHint}</Text>
            </View>
            <View style={styles.editPill}>
              <MaterialCommunityIcons name="pencil-outline" size={14} color="#2563EB" />
              <Text style={styles.editPillText}>{copy.edit}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <DetailCell
              icon="storefront-outline"
              tint="#F5F3FF"
              color="#7C3AED"
              label={copy.storeName}
              value={businessName || copy.notSet}
            />
            <DetailCell
              icon="phone-outline"
              tint="#ECFDF3"
              color="#16A34A"
              label={copy.contactNumber}
              value={phone || copy.notSet}
            />
          </View>
          <View style={styles.detailRow}>
            <DetailCell
              icon="clock-outline"
              tint="#FFF7ED"
              color="#F59E0B"
              label={copy.businessHours}
              value={hoursLabel || copy.notSet}
            />
            <DetailCell
              icon="map-marker-outline"
              tint="#FFF1F2"
              color="#E11D48"
              label={copy.address}
              value={address || copy.notSet}
            />
          </View>
          <View style={styles.descriptionCell}>
            <View style={[styles.detailIcon, { backgroundColor: "#F5F3FF" }]}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color="#7C3AED" />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>{copy.description}</Text>
              <Text style={styles.detailValue}>{description || copy.notSet}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#ECFDF3" }]}>
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color="#16A34A" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>{copy.servicesPricing}</Text>
              <Text style={styles.sectionHint}>{copy.servicesHint}</Text>
            </View>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={copy.addNewService}
            >
              <MaterialCommunityIcons name="plus" size={14} color="#2563EB" />
              <Text style={styles.addBtnText}>{copy.addNewService}</Text>
            </Pressable>
          </View>
          {serviceRows.map((row, index) => {
            const visual = SERVICE_VISUAL[row.key];
            const countLabel =
              row.count === 0
                ? copy.addPrices
                : fill(row.count === 1 ? copy.item : copy.items, { count: row.count });
            return (
              <Pressable
                key={row.key}
                onPress={() => openService(row.key)}
                style={({ pressed }) => [
                  styles.serviceRow,
                  index < serviceRows.length - 1 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={serviceLabel(row.key)}
              >
                <View style={[styles.detailIcon, { backgroundColor: visual.tint }]}>
                  <MaterialCommunityIcons name={visual.icon} size={18} color={visual.color} />
                </View>
                <View style={styles.detailBody}>
                  <Text style={styles.serviceTitle}>{serviceLabel(row.key)}</Text>
                  <Text style={styles.detailLabel}>{countLabel}</Text>
                </View>
                <Text style={styles.priceText}>
                  {row.amount == null ? copy.notSet : fill(copy.fromPrice, { amount: formatAmount(row.amount) })}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#C5CDD8" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <AppCtaButton
          label={copy.saveChanges}
          rightIcon="arrow-right"
          onPress={() => router.back()}
        />
      </View>

      {pickerOpen ? (
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.pickerTitle}>{copy.chooseService}</Text>
            {SERVICE_ORDER.map((key) => {
              const visual = SERVICE_VISUAL[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => openService(key)}
                  style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}
                >
                  <View style={[styles.detailIcon, { backgroundColor: visual.tint }]}>
                    <MaterialCommunityIcons name={visual.icon} size={18} color={visual.color} />
                  </View>
                  <Text style={styles.serviceTitle}>{serviceLabel(key)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DetailCell({
  icon,
  tint,
  color,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tint: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailCell}>
      <View style={[styles.detailIcon, { backgroundColor: tint }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, gap: 4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: NAVY },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: MUTED, fontWeight: "500" },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  coverWrap: { height: 148, backgroundColor: "#E8F1FF" },
  cover: { width: "100%", height: "100%" },
  coverBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  coverBtnText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  identity: { flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -36,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  identityBody: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  storeName: { flex: 1, fontSize: 18, fontWeight: "800", color: NAVY },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  statusDotClosed: { backgroundColor: "#E11D48" },
  statusDotUnknown: { backgroundColor: "#94A3B8" },
  statusText: { color: "#15803D", fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { flexShrink: 1, color: "#64748B", fontSize: 12, fontWeight: "600" },
  metaDivider: { color: "#CBD5E1", marginHorizontal: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    shadowColor: NAVY,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionText: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: NAVY },
  sectionHint: { marginTop: 2, fontSize: 12, color: MUTED, fontWeight: "500" },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editPillText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  detailRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  detailCell: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: 16,
    padding: 10,
  },
  descriptionCell: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: 16,
    padding: 10,
  },
  detailIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  detailBody: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 11, color: MUTED, fontWeight: "600" },
  detailValue: { marginTop: 2, fontSize: 13, color: NAVY, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  addBtnText: { color: "#2563EB", fontSize: 11, fontWeight: "700" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEF2F6" },
  serviceTitle: { fontSize: 15, fontWeight: "800", color: NAVY },
  priceText: { color: NAVY, fontSize: 13, fontWeight: "700" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#F4F7FB",
  },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17, 24, 39, 0.35)" },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 4,
  },
  pickerTitle: { fontSize: 16, fontWeight: "800", color: NAVY, marginBottom: 8 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  pressed: { opacity: 0.75 },
});
