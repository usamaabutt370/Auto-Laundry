import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { showAppAlert } from "@/components/app-alert";
import { Input } from "@/components/ui/input";
import { AppCtaButton } from "@/components/ui/cta-button";
import { AppHeader } from "@/components/app-header";
import { UI } from "@/constants/theme";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { getStrings } from "@/locales";
import { ensureActiveUserProfile } from "@/lib/ensure-user-profile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getDeviceCoordinatesWithStatus } from "@/utils/device-location";
import { reverseGeocodeDetails } from "@/utils/geocoding";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

const HOURS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const MINUTES = Array.from({ length: 60 }, (_, idx) => idx);
const PERIODS = ["AM", "PM"] as const;
const WHEEL_ITEM_HEIGHT = 40;
const MAX_BUSINESS_IMAGES = 10;
const BUSINESS_IMAGES_BUCKET = "business-images";
const DESCRIPTION_MAX = 300;

type StagedBusinessImage = {
  id: string;
  uri: string;
  uploaded: boolean;
};

type PartnerBusinessDetailsFormMode = "onboarding" | "profile";

const ROLE_SWITCH_RETURN_ROUTES: Record<string, "/(customer)/(tabs)/profile" | "/(customer)/userinfo"> = {
  customer_profile: "/(customer)/(tabs)/profile",
  customer_userinfo: "/(customer)/userinfo",
};

type Props = {
  mode: PartnerBusinessDetailsFormMode;
};

function normalizePhoneDigits(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 15);
}

function formatTimeLabel(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minuteLabel = String(minutes).padStart(2, "0");
  return `${hour12}:${minuteLabel} ${period}`;
}

function timePeriodIcon(date: Date | null, emptyFallback: "am" | "pm") {
  const afternoon = date != null ? date.getHours() >= 12 : emptyFallback === "pm";
  return afternoon
    ? { name: "moon-waning-crescent" as const, color: UI.blue }
    : { name: "weather-sunny" as const, color: "#F59E0B" };
}

function parseTimeLabelToDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const date = new Date();
  let hours24 = hour % 12;
  if (period === "PM") hours24 += 12;
  date.setHours(hours24, minute, 0, 0);
  return date;
}

export function PartnerBusinessDetailsForm({ mode }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; returnTo?: string }>();
  const { locale } = useLocale();
  const { user, refreshRole } = useAuth();
  const s = getStrings(locale).partner.onboarding;
  const settings = getStrings(locale).partner.settings;

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<(typeof PERIODS)[number]>("AM");
  const [address, setAddress] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [businessImages, setBusinessImages] = useState<StagedBusinessImage[]>([]);
  const [offerPickup, setOfferPickup] = useState(false);
  const [offerDelivery, setOfferDelivery] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [coordsCache, setCoordsCache] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const hourRef = useRef<ScrollView | null>(null);
  const minuteRef = useRef<ScrollView | null>(null);
  const periodRef = useRef<ScrollView | null>(null);

  const startTimeLabel = startTime ? formatTimeLabel(startTime) : "";
  const endTimeLabel = endTime ? formatTimeLabel(endTime) : "";
  const startPeriodIcon = timePeriodIcon(startTime, "am");
  const endPeriodIcon = timePeriodIcon(endTime, "pm");
  const isAvailableTimeValid =
    Boolean(startTime && endTime) &&
    startTime!.getHours() * 60 + startTime!.getMinutes() <
      endTime!.getHours() * 60 + endTime!.getMinutes();
  const normalizedAvailableTime =
    startTime && endTime ? `${startTimeLabel} - ${endTimeLabel}` : "";

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;

    supabase
      .from("partner_profiles")
      .select(
        "business_name, business_description, phone_number, available_time, address, latitude, longitude, business_images, pickup_delivery_enabled"
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBusinessName(data.business_name ?? "");
        setBusinessDescription((data.business_description ?? "").slice(0, DESCRIPTION_MAX));
        const rawPhone = data.phone_number ?? "";
        if (rawPhone.startsWith("+")) {
          const parsed = parsePhoneNumberFromString(rawPhone);
          if (parsed) {
            setPhoneNumber(parsed.nationalNumber as string);
            setCallingCode(parsed.countryCallingCode as string);
          } else {
            setPhoneNumber(normalizePhoneDigits(rawPhone));
          }
        } else {
          setPhoneNumber(normalizePhoneDigits(rawPhone));
        }
        const rawAvailable = (data.available_time ?? "").trim();
        const [rawStart = "", rawEnd = ""] = rawAvailable
          .split("-")
          .map((v: string) => v.trim());
        setStartTime(parseTimeLabelToDate(rawStart));
        setEndTime(parseTimeLabelToDate(rawEnd));
        setAddress(data.address ?? "");
        const offersPickupDelivery = Boolean(
          (data as { pickup_delivery_enabled?: boolean | null }).pickup_delivery_enabled,
        );
        setOfferPickup(offersPickupDelivery);
        setOfferDelivery(offersPickupDelivery);
        const lat = (data as { latitude?: number | null }).latitude;
        const lng = (data as { longitude?: number | null }).longitude;
        if (typeof lat === "number" && typeof lng === "number") {
          setCoordsCache({ latitude: lat, longitude: lng });
        }

        const imagesRaw = (data as { business_images?: unknown }).business_images;
        if (Array.isArray(imagesRaw)) {
          setBusinessImages(
            imagesRaw
              .filter((v): v is string => typeof v === "string")
              .map((url) => ({
                id: `remote-${url}`,
                uri: url,
                uploaded: true,
              }))
          );
        }
      });

    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle<{ phone: string | null }>()
      .then(({ data }) => {
        if (data?.phone?.trim() && phoneNumber.trim().length === 0) {
          const parsed = parsePhoneNumberFromString(data.phone.trim());
          if (parsed) {
            if (parsed.country) setCountryCode(parsed.country as CountryCode);
            setCallingCode(parsed.countryCallingCode as string);
            setPhoneNumber(parsed.nationalNumber as string);
          } else {
            setPhoneNumber(normalizePhoneDigits(data.phone));
          }
        }
      });
  }, [user?.id, phoneNumber]);

  const isBusinessNameMissing = businessName.trim().length === 0;
  const isBusinessDescriptionMissing = businessDescription.trim().length === 0;
  const isAddressMissing = address.trim().length === 0;
  const isPhoneMissing = phoneNumber.trim().length === 0;
  const isPhoneValid = !isPhoneMissing
    ? Boolean(parsePhoneNumberFromString(`+${callingCode}${phoneNumber}`)?.isValid())
    : false;
  const isAvailableTimeMissing = !startTime || !endTime;
  const isFormValid =
    !isBusinessNameMissing &&
    !isBusinessDescriptionMissing &&
    !isAddressMissing &&
    isPhoneValid &&
    isAvailableTimeValid;

  const openPicker = useCallback(
    (type: "start" | "end") => {
      const base = (() => {
        if (type === "start") {
          if (startTime) return startTime;
          const d = new Date();
          d.setHours(7, 0, 0, 0);
          return d;
        }
        if (endTime) return endTime;
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        return d;
      })();
      const hours = base.getHours();
      setPickerHour(hours % 12 || 12);
      setPickerMinute(base.getMinutes());
      setPickerPeriod(hours >= 12 ? "PM" : "AM");
      setActivePicker(type);
      setTimeout(() => {
        hourRef.current?.scrollTo({ y: ((hours % 12 || 12) - 1) * WHEEL_ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: base.getMinutes() * WHEEL_ITEM_HEIGHT, animated: false });
        periodRef.current?.scrollTo({ y: (hours >= 12 ? 1 : 0) * WHEEL_ITEM_HEIGHT, animated: false });
      }, 0);
    },
    [startTime, endTime]
  );

  const handlePickerConfirm = useCallback(() => {
    if (!activePicker) return;
    const selected = new Date();
    let hours24 = pickerHour % 12;
    if (pickerPeriod === "PM") hours24 += 12;
    selected.setHours(hours24, pickerMinute, 0, 0);
    if (activePicker === "start") setStartTime(selected);
    else setEndTime(selected);
    setActivePicker(null);
  }, [activePicker, pickerHour, pickerMinute, pickerPeriod]);

  const getWheelIndex = (offsetY: number, length: number) => {
    const idx = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    return Math.max(0, Math.min(length - 1, idx));
  };

  const pickBusinessImages = useCallback(async () => {
    if (!supabase || !user?.id) return;
    if (businessImages.length >= MAX_BUSINESS_IMAGES) {
      showAppAlert("Limit reached", `Maximum ${MAX_BUSINESS_IMAGES} business images allowed.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert("Permission needed", "Please allow photo access to upload business images.");
      return;
    }
    const remaining = MAX_BUSINESS_IMAGES - businessImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const staged: StagedBusinessImage[] = [];
    result.assets.forEach((asset, index) => {
      if (!asset.uri) return;
      staged.push({
        id: `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        uri: asset.uri,
        uploaded: false,
      });
    });
    setBusinessImages((prev) => [...prev, ...staged].slice(0, MAX_BUSINESS_IMAGES));
  }, [businessImages.length, user?.id]);

  const removeBusinessImage = useCallback((imageId: string) => {
    setBusinessImages((prev) => prev.filter((item) => item.id !== imageId));
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (mode === "onboarding" && params.from === "role_switch") {
      void (async () => {
        if (user?.id && isSupabaseConfigured() && supabase) {
          try {
            const { error } = await supabase
              .from("profiles")
              .update({ role: "customer", updated_at: new Date().toISOString() })
              .eq("id", user.id);
            if (error) throw error;
            await refreshRole();
          } catch {
            // Still return to customer even if role revert fails.
          }
        }
        const returnRoute =
          ROLE_SWITCH_RETURN_ROUTES[
            typeof params.returnTo === "string" ? params.returnTo : ""
          ] ?? "/(customer)/(tabs)/profile";
        router.replace(returnRoute);
      })();
      return;
    }

    if (mode === "profile") {
      router.replace("/(partner)/(tabs)/profile");
      return;
    }

    router.replace("/(partner)/(tabs)");
  }, [mode, params.from, params.returnTo, refreshRole, router, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  const handleSubmit = useCallback(async () => {
    if (isSaving) return;
    setSubmitAttempted(true);
    if (!isFormValid) return;
    if (!isSupabaseConfigured() || !supabase) {
      showAppAlert("Configuration error", "Supabase is not configured.");
      return;
    }
    if (!user?.id) {
      showAppAlert("Authentication error", "Please sign in again and try.");
      return;
    }

    const profileReady = await ensureActiveUserProfile(user);
    if (!profileReady.ok) {
      showAppAlert("Account error", profileReady.error);
      return;
    }

    setIsSaving(true);
    try {
      let coords = coordsCache;
      if (!coords) {
        const locationResult = await getDeviceCoordinatesWithStatus();
        if (!locationResult.coords) {
          if (locationResult.status === "denied") {
            showAppAlert(
              "Location permission required",
              "Please allow location permission so we can place your business marker on the map.",
            );
          } else {
            showAppAlert(
              "Location unavailable",
              "We could not detect your current location. Please try again in an open area with GPS enabled.",
            );
          }
          return;
        }
        coords = locationResult.coords;
        setCoordsCache(coords);
      }

      const fullPhone = `+${callingCode}${phoneNumber}`;
      const parsedPhoneObj = parsePhoneNumberFromString(fullPhone);
      const normalizedPhone = parsedPhoneObj ? parsedPhoneObj.number : fullPhone;

      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < businessImages.length; i += 1) {
        const image = businessImages[i];
        if (image.uploaded) {
          uploadedImageUrls.push(image.uri);
          continue;
        }
        let bytes: ArrayBuffer;
        let contentType: string;
        let ext: string;
        if (Platform.OS === "web") {
          const response = await fetch(image.uri);
          bytes = await response.arrayBuffer();
          const mime = (response.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
          contentType = mime;
          ext = mime === "image/png" ? "png" : "jpg";
        } else {
          const lower = image.uri.toLowerCase();
          const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
          ext = isJpeg ? "jpg" : "png";
          contentType = isJpeg ? "image/jpeg" : "image/png";
          const file = new FileSystem.File(image.uri);
          bytes = await file.arrayBuffer();
        }
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUSINESS_IMAGES_BUCKET)
          .upload(path, bytes, { upsert: true, contentType });
        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage.from(BUSINESS_IMAGES_BUCKET).getPublicUrl(path);
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }

      const payload = {
        id: user.id,
        business_name: businessName.trim(),
        business_description: businessDescription.trim().slice(0, DESCRIPTION_MAX),
        phone_number: normalizedPhone,
        available_time: normalizedAvailableTime.toUpperCase(),
        address: address.trim(),
        business_images: uploadedImageUrls,
        pickup_delivery_enabled: offerPickup || offerDelivery,
        updated_at: new Date().toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      const { error } = await supabase.from("partner_profiles").upsert(payload, {
        onConflict: "id",
      });
      if (error) {
        showAppAlert("Save failed", error.message);
        return;
      }

      setBusinessImages(
        uploadedImageUrls.map((url) => ({
          id: `remote-${url}`,
          uri: url,
          uploaded: true,
        }))
      );

      if (mode === "onboarding") {
        router.push("/(partner)/onboarding/step2");
      } else {
        router.replace("/(partner)/(tabs)/profile");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save details.";
      showAppAlert("Save failed", message);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    isFormValid,
    user?.id,
    address,
    businessName,
    businessDescription,
    phoneNumber,
    businessImages,
    normalizedAvailableTime,
    callingCode,
    mode,
    router,
    coordsCache,
    offerPickup,
    offerDelivery,
  ]);

  const handleLocateAddress = useCallback(async () => {
    if (locatingAddress) return;
    setLocatingAddress(true);
    try {
      const locationResult = await getDeviceCoordinatesWithStatus();
      if (!locationResult.coords) {
        if (locationResult.status === "denied") {
          showAppAlert(
            "Location permission required",
            "Please allow location permission to fill your business address.",
          );
        } else {
          showAppAlert(
            "Location unavailable",
            "We could not detect your current location. Please try again.",
          );
        }
        return;
      }
      setCoordsCache(locationResult.coords);
      const details = await reverseGeocodeDetails(locationResult.coords);
      if (details?.displayName?.trim()) {
        setAddress(details.displayName.trim());
      } else {
        showAppAlert(
          "Address unavailable",
          "Location found, but we could not resolve a street address. You can type it manually.",
        );
      }
    } finally {
      setLocatingAddress(false);
    }
  }, [locatingAddress]);

  const headerTitle = mode === "onboarding" ? s.step1Title : "Business Details";
  const headerSubtitle =
    mode === "onboarding"
      ? s.step1Subtitle
      : "Update your business info. Customers see this on your profile.";
  const saveLabel = mode === "onboarding" ? "Save & Continue" : settings.save;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <AppHeader
        appearance="light"
        title={headerTitle}
        subtitle={headerSubtitle}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        leftAccessibilityLabel={s.back}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{backgroundColor: "transparent"}}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder={s.businessNamePlaceholder}
            placeholderTextColor={UI.muted}
            value={businessName}
            onChangeText={setBusinessName}
          />
          </View>
          {submitAttempted && isBusinessNameMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}

          <Text style={styles.fieldLabel}>Contact Number</Text>
          <Input
            appearance="light"
            variant="phone"
            placeholder="Business contact number"
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(normalizePhoneDigits(value))}
            selectedCca2={countryCode}
            selectedCallingCode={callingCode}
            onCountrySelect={(c) => {
              setCountryCode(c.cca2);
              setCallingCode(c.callingCode);
            }}
            containerStyle={styles.phoneInput}
          />
          <Text style={styles.hintText}>
            This number will be shown to customers and can be different from your profile phone.
          </Text>
          {submitAttempted && isPhoneMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}
          {submitAttempted && !isPhoneMissing && !isPhoneValid ? (
            <Text style={styles.errorText}>Enter a valid mobile number for {countryCode}.</Text>
          ) : null}
          <Text style={styles.fieldLabel}>Available Hours</Text>
          <View style={styles.timeRow}>
            <Pressable
              style={({ pressed }) => [styles.timeInputHalf, pressed && styles.pressed]}
              onPress={() => openPicker("start")}
            >
              <MaterialCommunityIcons
                name={startPeriodIcon.name}
                size={18}
                color={startPeriodIcon.color}
              />
              <Text style={[styles.timeInputText, !startTimeLabel && styles.placeholderText]}>
                {startTimeLabel || s.startTimePlaceholder}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={UI.muted} />
            </Pressable>
            <Text style={styles.timeDash}>–</Text>
            <Pressable
              style={({ pressed }) => [styles.timeInputHalf, pressed && styles.pressed]}
              onPress={() => openPicker("end")}
            >
              <MaterialCommunityIcons
                name={endPeriodIcon.name}
                size={18}
                color={endPeriodIcon.color}
              />
              <Text style={[styles.timeInputText, !endTimeLabel && styles.placeholderText]}>
                {endTimeLabel || s.endTimePlaceholder}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={UI.muted} />
            </Pressable>
          </View>
          {submitAttempted && isAvailableTimeMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}
          {submitAttempted && !isAvailableTimeMissing && !isAvailableTimeValid ? (
            <Text style={styles.errorText}>{s.availableTimeRangeInvalid}</Text>
          ) : null}

          <Modal
            transparent
            visible={Boolean(activePicker)}
            animationType="fade"
            onRequestClose={() => setActivePicker(null)}
          >
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)} />
              <View style={styles.modalCard}>
                <Text style={styles.pickerTitle}>
                  {activePicker === "start" ? s.startTimePlaceholder : s.endTimePlaceholder}
                </Text>
                <View style={styles.wheelContainer}>
                  <View style={styles.wheelHighlight} pointerEvents="none" />
                  <ScrollView
                    ref={hourRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, HOURS.length);
                      setPickerHour(HOURS[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, HOURS.length);
                      setPickerHour(HOURS[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {HOURS.map((item) => (
                      <View key={`hour-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerHour && styles.wheelTextSelected]}>
                          {String(item).padStart(2, "0")}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <ScrollView
                    ref={minuteRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, MINUTES.length);
                      setPickerMinute(MINUTES[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, MINUTES.length);
                      setPickerMinute(MINUTES[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {MINUTES.map((item) => (
                      <View key={`minute-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerMinute && styles.wheelTextSelected]}>
                          {String(item).padStart(2, "0")}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <ScrollView
                    ref={periodRef}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={WHEEL_ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, PERIODS.length);
                      setPickerPeriod(PERIODS[idx]);
                    }}
                    onScrollEndDrag={(event) => {
                      const idx = getWheelIndex(event.nativeEvent.contentOffset.y, PERIODS.length);
                      setPickerPeriod(PERIODS[idx]);
                    }}
                    style={styles.wheelList}
                    contentContainerStyle={styles.wheelContent}
                  >
                    {PERIODS.map((item) => (
                      <View key={`period-${item}`} style={styles.wheelItem}>
                        <Text style={[styles.wheelText, item === pickerPeriod && styles.wheelTextSelected]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.pickerActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setActivePicker(null)}>
                    <Text style={styles.cancelBtnText}>{s.back}</Text>
                  </Pressable>
                  <Pressable style={styles.doneBtn} onPress={handlePickerConfirm}>
                    <Text style={styles.doneBtnText}>{s.confirm}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <Text style={styles.fieldLabel}>Address</Text>
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.fieldInput, styles.addressInput]}
              placeholder={s.addressPlaceholder}
              placeholderTextColor={UI.muted}
              value={address}
              onChangeText={setAddress}
            />
            <Pressable
              onPress={() => void handleLocateAddress()}
              style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Use current location"
              disabled={locatingAddress}
            >
              <MaterialCommunityIcons
                name={locatingAddress ? "loading" : "crosshairs-gps"}
                size={20}
                color={UI.blue}
              />
            </Pressable>
          </View>
          <Text style={styles.hintText}>Tap to select your location on map</Text>
          {submitAttempted && isAddressMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}

          <View style={{backgroundColor: "transparent"}}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={ styles.descriptionInput}
            placeholder={s.businessDescriptionPlaceholder}
            placeholderTextColor={UI.muted}
            value={businessDescription}
            onChangeText={(text) => setBusinessDescription(text.slice(0, DESCRIPTION_MAX))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {businessDescription.length}/{DESCRIPTION_MAX}
          </Text>
          {submitAttempted && isBusinessDescriptionMissing ? (
            <Text style={styles.errorText}>{s.requiredFieldError}</Text>
          ) : null}
        </View>
          <Text style={styles.fieldLabel}>Pickup & Delivery</Text>
          <View style={styles.offerCard}>
            <View style={styles.offerHalf}>
              <MaterialCommunityIcons name="truck-outline" size={22} color={UI.blue} />
              <Text style={styles.offerLabel} numberOfLines={1}>
                I offer pickup
              </Text>
              <Switch
                value={offerPickup}
                onValueChange={setOfferPickup}
                trackColor={{ false: UI.chipBorder, true: UI.blue }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={UI.chipBorder}
                style={styles.offerSwitch}
              />
            </View>
            <View style={styles.offerDivider} />
            <View style={styles.offerHalf}>
              <MaterialCommunityIcons name="motorbike" size={22} color={UI.teal} />
              <Text style={styles.offerLabel} numberOfLines={1}>
                I offer delivery
              </Text>
              <Switch
                value={offerDelivery}
                onValueChange={setOfferDelivery}
                trackColor={{ false: UI.chipBorder, true: UI.blue }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={UI.chipBorder}
                style={styles.offerSwitch}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Business Images ({businessImages.length}/{MAX_BUSINESS_IMAGES})
          </Text>
          <View style={styles.businessImagesWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.businessImagesRow}
            >
              {businessImages.map((image) => (
                <View key={image.id} style={styles.businessImageItem}>
                  <Image source={{ uri: image.uri }} style={styles.businessImage} />
                  <Pressable
                    style={styles.businessImageRemove}
                    onPress={() => removeBusinessImage(image.id)}
                  >
                    <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
              {businessImages.length < MAX_BUSINESS_IMAGES ? (
                <Pressable
                  onPress={pickBusinessImages}
                  style={({ pressed }) => [styles.addBusinessImageBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="plus" size={22} color={UI.blue} />
                  <Text style={styles.addBusinessImageText}>Add image</Text>
                </Pressable>
              ) : null}
              {Array.from({
                length: Math.max(0, 3 - (businessImages.length + (businessImages.length < MAX_BUSINESS_IMAGES ? 1 : 0))),
              }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.emptyImageSlot} />
              ))}
            </ScrollView>
          </View>

          <AppCtaButton
            label={saveLabel}
            onPress={handleSubmit}
            width="full"
            rightIcon={mode === "onboarding" ? "arrow-right" : "check"}
            loading={isSaving}
            disabled={isSaving}
            style={styles.nextBtn}
            accessibilityLabel={saveLabel}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
  },
  scroll: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
    marginBottom: 5,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.border,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  addressInput: {
    flex: 1,
    marginBottom: 0,
  },
  locateBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.iconWell,
    alignItems: "center",
    justifyContent: "center",
  },
  descriptionInput: {
    minHeight: 110,
    paddingTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.border,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: UI.text,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: UI.muted,
    marginBottom: 12,
    lineHeight: 17,
  },
  phoneInput: {
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  timeInputHalf: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  timeInputText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  placeholderText: {
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  timeDash: {
    fontSize: 16,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  offerHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  offerDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: UI.chipBorder,
    marginHorizontal: 6,
  },
  offerLabel: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins-SemiBold",
    color: UI.text,
  },
  offerSwitch: {
    marginLeft: 2,
    transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    padding: 14,
  },
  pickerTitle: {
    color: UI.text,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },
  wheelContainer: {
    flexDirection: "row",
    gap: 8,
    height: WHEEL_ITEM_HEIGHT * 5,
    position: "relative",
    overflow: "hidden",
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT * 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: UI.iconWell,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    zIndex: 0,
  },
  wheelList: {
    flex: 1,
    zIndex: 1,
  },
  wheelContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelText: {
    color: UI.muted,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  wheelTextSelected: {
    color: UI.text,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  pickerActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: UI.muted,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneBtnText: {
    color: UI.blue,
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  errorText: {
    color: UI.red,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: -4,
    marginBottom: 10,
  },
  businessImagesWrap: {
    marginBottom: 20,
  },
  businessImagesRow: {
    gap: 10,
    paddingRight: 8,
  },
  businessImageItem: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.iconWell,
  },
  businessImage: {
    width: "100%",
    height: "100%",
  },
  businessImageRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBusinessImageBtn: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: UI.blue,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addBusinessImageText: {
    color: UI.blue,
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  emptyImageSlot: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: UI.chipBorder,
    backgroundColor: UI.bg,
  },
  nextBtn: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
