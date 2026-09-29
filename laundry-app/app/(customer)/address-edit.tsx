import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddressLocationMap } from "@/components/address-location-map";
import { showAppAlert } from "@/components/app-alert";
import { GradientLoader } from "@/components/ui/gradient-loader";
import { useLocale } from "@/contexts/locale-context";
import { gradients, UI } from "@/constants/theme";
import {
  composeAddressLine,
  createCustomerAddress,
  fetchCustomerAddresses,
  updateCustomerAddress,
  type AddressIcon,
} from "@/lib/customer-addresses";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getStrings } from "@/locales";
import { getDeviceCoordinatesWithStatus, LAHORE_CITY } from "@/utils/device-location";
import {
  reverseGeocodeDetails,
  searchAddressDetails,
  type Coordinates,
} from "@/utils/geocoding";

const TYPES: { id: AddressIcon; icon: "home-outline" | "office-building-outline" | "flag-outline" }[] =
  [
    { id: "home", icon: "home-outline" },
    { id: "office", icon: "office-building-outline" },
    { id: "other", icon: "flag-outline" },
  ];

export default function AddressEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof id === "string" && id.length > 0 ? id : null;
  const { locale } = useLocale();
  const s = getStrings(locale).customer.addresses;
  const searchRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardHeight = Math.min(
    Math.round(windowHeight * 0.88),
    Math.round(windowHeight - insets.top - insets.bottom - 24),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [icon, setIcon] = useState<AddressIcon>("home");
  const [customTitle, setCustomTitle] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [useForPickup, setUseForPickup] = useState(true);
  const [useForDelivery, setUseForDelivery] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const applyDetails = useCallback(
    (details: {
      displayName: string;
      houseNo: string;
      street: string;
      city: string;
      coords: Coordinates;
    }) => {
      setCoords(details.coords);
      setSelectedLocation(details.displayName);
      if (details.houseNo) setHouseNo(details.houseNo);
      if (details.street) setStreet(details.street);
      if (details.city) setCity(details.city);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (editingId) {
        const list = await fetchCustomerAddresses();
        const row = list.find((item) => item.id === editingId);
        if (!row) {
          showAppAlert(s.error);
          router.back();
          return;
        }
        setIcon(row.icon);
        setCustomTitle(row.icon === "other" ? row.label : "");
        setHouseNo(row.houseNo);
        setStreet(row.street);
        setCity(row.city);
        setLandmark(row.landmark);
        setSelectedLocation(row.selectedLocation || row.addressLine);
        setUseForPickup(row.useForPickup);
        setUseForDelivery(row.useForDelivery);
        setIsDefault(row.isDefault);
        setContactName(row.contactName);
        setContactPhone(row.contactPhone);
        if (row.latitude != null && row.longitude != null) {
          setCoords({ latitude: row.latitude, longitude: row.longitude });
        }
      } else {
        if (isSupabaseConfigured()) {
          const {
            data: { session },
          } = await getSession();
          const userId = session?.user?.id;
          if (userId) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name,first_name,last_name,phone")
              .eq("id", userId)
              .maybeSingle<{
                full_name: string | null;
                first_name: string | null;
                last_name: string | null;
                phone: string | null;
              }>();
            const name =
              (data?.full_name ?? "").trim() ||
              [data?.first_name ?? "", data?.last_name ?? ""].join(" ").trim();
            if (name) setContactName(name);
            if (data?.phone) setContactPhone(data.phone);
          }
        }
      }
    } catch (err) {
      showAppAlert(s.error, err instanceof Error ? err.message : s.error);
      if (editingId) router.back();
    } finally {
      setLoading(false);
    }
  }, [editingId, router, s.error]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickCoords = async (next: Coordinates) => {
    setCoords(next);
    const details = await reverseGeocodeDetails(next);
    if (details) applyDetails(details);
    else setSelectedLocation(`${next.latitude.toFixed(5)}, ${next.longitude.toFixed(5)}`);
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const result = await getDeviceCoordinatesWithStatus();
      const next = result.coords ?? LAHORE_CITY;
      await pickCoords(next);
    } finally {
      setLocating(false);
    }
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLocating(true);
    try {
      const details = await searchAddressDetails(q);
      if (!details) {
        showAppAlert(s.searchEmpty);
        return;
      }
      applyDetails(details);
    } finally {
      setLocating(false);
    }
  };

  const onSave = async () => {
    const line = composeAddressLine({
      houseNo,
      street,
      city,
      selectedLocation,
    });
    if (!line) {
      showAppAlert(s.required);
      return;
    }
    if (icon === "other" && !customTitle.trim()) {
      showAppAlert(s.titleRequired);
      return;
    }
    setSaving(true);
    try {
      const typeLabel =
        icon === "office"
          ? s.office
          : icon === "other"
            ? customTitle.trim()
            : s.home;
      const payload = {
        label: typeLabel,
        addressLine: line,
        houseNo,
        street,
        city,
        landmark,
        selectedLocation: selectedLocation || line,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        contactName,
        contactPhone,
        icon,
        isDefault,
        useForPickup,
        useForDelivery,
      };
      if (editingId) {
        await updateCustomerAddress(editingId, payload);
      } else {
        await createCustomerAddress(payload);
      }
      router.back();
    } catch (err) {
      showAppAlert(s.error, err instanceof Error ? err.message : s.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <StatusBar style="light" />
      <Pressable
        style={styles.dismiss}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.cardWrap}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.card,
            {
              height: cardHeight,
              marginTop: Math.max(insets.top, 12),
              marginBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons name="close" size={20} color={UI.text} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>
                {editingId ? s.formEditTitle : s.formAddTitle}
              </Text>
              <Text style={styles.subtitle}>{s.formSubtitle}</Text>
            </View>
            {/* Invisible spacer mirrors the close button width so the title stays centered. */}
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <GradientLoader />
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sectionHead}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>1</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{s.chooseLocation}</Text>
                </View>

                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={18} color={UI.muted} />
                    <TextInput
                      ref={searchRef}
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={s.searchPlaceholder}
                      placeholderTextColor={UI.muted}
                      returnKeyType="search"
                      onSubmitEditing={() => void runSearch()}
                    />
                  </View>
                  <Pressable
                    onPress={() => void handleUseCurrentLocation()}
                    style={styles.locateBtn}
                    accessibilityLabel={s.useCurrent}
                  >
                    {locating ? (
                      <ActivityIndicator size="small" color={UI.purple} />
                    ) : (
                      <MaterialCommunityIcons name="crosshairs-gps" size={20} color={UI.purple} />
                    )}
                  </Pressable>
                </View>

                <View style={styles.mapCard}>
                  <AddressLocationMap coords={coords} onPick={(next) => void pickCoords(next)} />
                  <Pressable
                    onPress={() => void handleUseCurrentLocation()}
                    style={styles.useCurrentFab}
                  >
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color={UI.purple} />
                    <Text style={styles.useCurrentFabText}>{s.useCurrent}</Text>
                  </Pressable>
                </View>

                <View style={styles.selectedCard}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={UI.purple} />
                  <View style={styles.selectedCopy}>
                    <Text style={styles.selectedLabel}>{s.selectedLocation}</Text>
                    <Text style={styles.selectedValue}>
                      {selectedLocation || s.selectedEmpty}
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionHead}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>2</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{s.addressDetails}</Text>
                </View>

                <View style={styles.typeRow}>
                  {TYPES.map((item) => {
                    const selected = icon === item.id;
                    const label =
                      item.id === "office" ? s.office : item.id === "other" ? s.other : s.home;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setIcon(item.id)}
                        style={[styles.typeChip, selected && styles.typeChipOn]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={16}
                          color={selected ? "#FFFFFF" : UI.muted}
                        />
                        <Text style={[styles.typeChipText, selected && styles.typeChipTextOn]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {icon === "other" ? (
                  <Field label={s.customTitle}>
                    <TextInput
                      style={styles.input}
                      value={customTitle}
                      onChangeText={setCustomTitle}
                      placeholder={s.customTitlePlaceholder}
                      placeholderTextColor={UI.muted}
                      autoCapitalize="words"
                    />
                  </Field>
                ) : null}

                <Field label={s.houseNo}>
                  <TextInput
                    style={styles.input}
                    value={houseNo}
                    onChangeText={setHouseNo}
                    placeholder={s.houseNoPlaceholder}
                    placeholderTextColor={UI.muted}
                  />
                </Field>
                <Field label={s.street}>
                  <TextInput
                    style={styles.input}
                    value={street}
                    onChangeText={setStreet}
                    placeholder={s.streetPlaceholder}
                    placeholderTextColor={UI.muted}
                  />
                </Field>
                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    <Field label={s.city}>
                      <TextInput
                        style={styles.input}
                        value={city}
                        onChangeText={setCity}
                        placeholder={s.cityPlaceholder}
                        placeholderTextColor={UI.muted}
                      />
                    </Field>
                  </View>
                  <View style={styles.col}>
                    <Field label={s.landmark}>
                      <TextInput
                        style={styles.input}
                        value={landmark}
                        onChangeText={setLandmark}
                        placeholder={s.landmarkPlaceholder}
                        placeholderTextColor={UI.muted}
                      />
                    </Field>
                  </View>
                </View>

                <View style={styles.sectionHead}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>3</Text>
                  </View>
                  <View>
                    <Text style={styles.sectionTitle}>{s.useFor}</Text>
                    <Text style={styles.sectionHint}>{s.useForHint}</Text>
                  </View>
                </View>

                <View style={styles.useRow}>
                  <UseChip
                    icon="truck-delivery-outline"
                    label={s.pickup}
                    on={useForPickup}
                    onPress={() => setUseForPickup((v) => !v)}
                  />
                  <UseChip
                    icon="home-outline"
                    label={s.delivery}
                    on={useForDelivery}
                    onPress={() => setUseForDelivery((v) => !v)}
                  />
                </View>

                <View style={styles.sectionHead}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>4</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{s.contactDetails}</Text>
                </View>

                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    <Field label={s.contactName}>
                      <TextInput
                        style={styles.input}
                        value={contactName}
                        onChangeText={setContactName}
                        placeholder={s.contactNamePlaceholder}
                        placeholderTextColor={UI.muted}
                        autoCapitalize="words"
                      />
                    </Field>
                  </View>
                  <View style={styles.col}>
                    <Field label={s.contactPhone}>
                      <TextInput
                        style={styles.input}
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder={s.contactPhonePlaceholder}
                        placeholderTextColor={UI.muted}
                        keyboardType="phone-pad"
                      />
                    </Field>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  onPress={() => void onSave()}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.saveWrap,
                    pressed && styles.pressed,
                    saving && styles.saveDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={[...gradients.cta]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.saveBtn}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveLabel}>{s.saveAddress}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function UseChip({
  icon,
  label,
  on,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.useChip, on ? styles.useChipOn : styles.useChipOff]}>
      <MaterialCommunityIcons name={icon} size={18} color={on ? UI.openText : UI.muted} />
      <Text style={[styles.useChipText, on ? styles.useChipTextOn : styles.useChipTextOff]}>
        {label}
      </Text>
      <View style={[styles.useCheck, on ? styles.useCheckOn : styles.useCheckOff]}>
        {on ? <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrap: {
    paddingHorizontal: 16,
    zIndex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 15,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#000000",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    textAlign: "center",
  },
  center: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: UI.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#FFFFFF", fontSize: 12, fontFamily: "Poppins-Bold" },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: "#000000",
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
  },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    padding: 0,
  },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: UI.chipBorder,
    position: "relative",
  },
  useCurrentFab: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: UI.shadowStrong,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  useCurrentFabText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.purple,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 12,
  },
  selectedCopy: { flex: 1, minWidth: 0 },
  selectedLabel: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  selectedValue: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    lineHeight: 18,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  typeChipOn: {
    backgroundColor: UI.purple,
    borderColor: UI.purple,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.muted,
  },
  typeChipTextOn: { color: "#FFFFFF" },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#000000",
  },
  input: {
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: UI.text,
  },
  twoCol: { flexDirection: "row", gap: 10 },
  col: { flex: 1, minWidth: 0 },
  useRow: { flexDirection: "row", gap: 10 },
  useChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  useChipOn: {
    backgroundColor: UI.openBg,
    borderColor: "#A7F3D0",
  },
  useChipOff: {
    backgroundColor: "#F3F4F6",
    borderColor: UI.chipBorder,
  },
  useChipText: { flex: 1, fontSize: 13, fontFamily: "Poppins-SemiBold" },
  useChipTextOn: { color: UI.openText },
  useChipTextOff: { color: UI.muted },
  useCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  useCheckOn: { backgroundColor: UI.teal },
  useCheckOff: { backgroundColor: UI.chipBorder },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.chipBorder,
    backgroundColor: "#FFFFFF",
  },
  saveWrap: { borderRadius: 14, overflow: "hidden" },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  saveDisabled: { opacity: 0.7 },
  pressed: { opacity: 0.85 },
});
