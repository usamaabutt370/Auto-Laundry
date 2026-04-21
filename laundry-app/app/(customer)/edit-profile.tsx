import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { getPaymentMethod, setPaymentMethod } from "@/lib/payment-storage";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type CountryCode } from "react-native-country-picker-modal";
import { Input } from "@/components";

const c = theme.colors;

const AVATAR_BUCKET = "avatars";
const AVATAR_PATH_PREFIX = "avatar"; // file will be avatar.jpg or avatar.png
const DOB_ITEM_HEIGHT = 44;
const DOB_VISIBLE_ROWS = 5;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isPaymentMode = mode === "payment";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("PK");
  const [callingCode, setCallingCode] = useState("92");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  /** Profile row updated_at – used to cache-bust avatar URL so same path shows new image after upload */
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null);
  /** Local URI from picker – shown immediately so user sees selected image before upload finishes */
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDay, setDobDay] = useState(1);
  const [dobMonth, setDobMonth] = useState(1);
  const [dobYear, setDobYear] = useState(2000);
  const dayWheelRef = useRef<ScrollView | null>(null);
  const monthWheelRef = useRef<ScrollView | null>(null);
  const yearWheelRef = useRef<ScrollView | null>(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const daysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  }, []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const yearOptions = useMemo(
    () => Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i),
    [],
  );
  const dayOptions = useMemo(
    () => Array.from({ length: daysInMonth(dobMonth, dobYear) }, (_, i) => i + 1),
    [dobMonth, dobYear, daysInMonth],
  );

  const parseStoredDate = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      const day = Number(iso[3]);
      if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { day, month, year };
      }
    }
    const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]);
      const year = Number(dmy[3]);
      if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { day, month, year };
      }
    }
    return null;
  }, []);

  const formatDobDisplay = useCallback((value: string) => {
    const parsed = parseStoredDate(value);
    if (!parsed) return "";
    const day = String(parsed.day).padStart(2, "0");
    const month = String(parsed.month).padStart(2, "0");
    return `${day}-${month}-${parsed.year}`;
  }, [parseStoredDate]);

  const openDobPicker = useCallback(() => {
    const parsed = parseStoredDate(dateOfBirth);
    const now = new Date();
    const nextYear = parsed?.year ?? now.getFullYear() - 18;
    const nextMonth = parsed?.month ?? 1;
    const maxDay = daysInMonth(nextMonth, nextYear);
    const nextDay = Math.min(parsed?.day ?? 1, maxDay);
    setDobYear(nextYear);
    setDobMonth(nextMonth);
    setDobDay(nextDay);
    setDobPickerVisible(true);
  }, [dateOfBirth, daysInMonth, parseStoredDate]);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await getSession();
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,email,phone,full_name,address,date_of_birth,image_url,updated_at",
        )
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!error && data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setAddress(data.address ?? "");
        setDateOfBirth(data.date_of_birth ?? "");
        setEmail(data.email ?? user.email ?? "");
        const phoneVal = data.phone ?? "";
        if (phoneVal.startsWith("+")) {
          const parsed = parsePhoneNumberFromString(phoneVal);
          if (parsed) {
            setPhone(parsed.nationalNumber as string);
            setCountryCode(parsed.country as CountryCode);
            setCallingCode(parsed.countryCallingCode as string);
          } else {
            setPhone(phoneVal);
          }
        } else {
          setPhone(phoneVal);
        }
        setImageUrl(data.image_url ?? null);
        setProfileUpdatedAt(data.updated_at ?? null);
        setLocalImageUri(null);
      } else {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        setFirstName((meta.first_name as string) ?? "");
        setLastName((meta.last_name as string) ?? "");
        setEmail(user.email ?? (meta.email as string) ?? "");
        const phoneVal = (meta.phone as string) ?? "";
        if (phoneVal.startsWith("+")) {
          const parsed = parsePhoneNumberFromString(phoneVal);
          if (parsed) {
            setPhone(parsed.nationalNumber as string);
            setCountryCode(parsed.country as CountryCode);
            setCallingCode(parsed.countryCallingCode as string);
          } else {
            setPhone(phoneVal);
          }
        } else {
          setPhone(phoneVal);
        }
        setAddress("");
        setDateOfBirth("");
      }
    } catch {
      // leave form as-is
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayment = useCallback(async () => {
    setLoading(true);
    try {
      const [stored, profileData] = await Promise.all([
        getPaymentMethod(),
        isSupabaseConfigured()
          ? getSession().then(async ({ data }) => {
              const user = data.session?.user;
              if (!user || !supabase) return null;
              const { data: row } = await supabase
                .from("profiles")
                .select("address, image_url, updated_at")
                .eq("id", user.id)
                .maybeSingle<{
                  address: string | null;
                  image_url: string | null;
                  updated_at: string | null;
                }>();
              return row;
            })
          : Promise.resolve(null),
      ]);
      if (stored) {
        setCardName(stored.cardName ?? "");
        setCardNumber("");
        setExpiration(stored.expiration ?? "");
        setBillingAddress(stored.address ?? "");
        setZipCode(stored.zipCode ?? "");
        setState(stored.state ?? "");
        setCountry(stored.country ?? "");
      }
      if (profileData) {
        setAddress(profileData.address ?? "");
        setImageUrl(profileData.image_url ?? null);
        setProfileUpdatedAt(profileData.updated_at ?? null);
      }
    } catch {
      // leave form as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPaymentMode) {
      loadPayment();
    } else {
      loadProfile();
    }
  }, [isPaymentMode, loadProfile, loadPayment]);

  useEffect(() => {
    const maxDay = daysInMonth(dobMonth, dobYear);
    if (dobDay > maxDay) {
      setDobDay(maxDay);
    }
  }, [dobDay, dobMonth, dobYear, daysInMonth]);

  useEffect(() => {
    if (!dobPickerVisible) return;
    const sync = () => {
      const dayIdx = Math.max(0, dayOptions.findIndex((v) => v === dobDay));
      const monthIdx = Math.max(0, monthOptions.findIndex((v) => v === dobMonth));
      const yearIdx = Math.max(0, yearOptions.findIndex((v) => v === dobYear));
      dayWheelRef.current?.scrollTo({ y: dayIdx * DOB_ITEM_HEIGHT, animated: false });
      monthWheelRef.current?.scrollTo({ y: monthIdx * DOB_ITEM_HEIGHT, animated: false });
      yearWheelRef.current?.scrollTo({ y: yearIdx * DOB_ITEM_HEIGHT, animated: false });
    };
    const t = setTimeout(sync, 0);
    return () => clearTimeout(t);
  }, [dayOptions, dobDay, dobMonth, dobPickerVisible, dobYear, monthOptions, yearOptions]);

  const getSelectedIndex = useCallback((offsetY: number, length: number) => {
    if (length <= 1) return 0;
    const raw = Math.round(offsetY / DOB_ITEM_HEIGHT);
    return Math.max(0, Math.min(raw, length - 1));
  }, []);

  const save = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await getSession();
      const user = session?.user;
      if (!user) {
        setSaving(false);
        return;
      }

      const emailVal = email.trim() || (user.email ?? "") || "";
      const rawPhone = phone.trim();
      const phoneNumberObj = parsePhoneNumberFromString(`+${callingCode}${rawPhone}`);

      if (!emailVal || !rawPhone) {
        Alert.alert(
          "Missing required fields",
          "Email and phone are required to save your profile.",
        );
        setSaving(false);
        return;
      }

      if (!phoneNumberObj || !phoneNumberObj.isValid()) {
        Alert.alert(
          "Invalid phone",
          `Please enter a valid mobile number for ${countryCode}.`,
        );
        setSaving(false);
        return;
      }

      const phoneVal = phoneNumberObj.number;

      const now = new Date().toISOString();
      const upsertPayload = {
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name:
          [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
        email: emailVal,
        phone: phoneVal,
        image_url: imageUrl || null,
        updated_at: now,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "id" });

      if (error) {
        Alert.alert(
          "Error",
          error.message || "Could not save profile. Please try again.",
        );
      } else {
        setProfileUpdatedAt(now);
        setLocalImageUri(null);
        // Navigate to profile tab so it refetches and shows updated image
        router.replace("/(customer)/(tabs)/profile");
      }
    } catch (err) {
      console.warn("[EditProfile] Save exception:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [
    firstName,
    lastName,
    address,
    dateOfBirth,
    email,
    phone,
    imageUrl,
    router,
  ]);

  const savePayment = useCallback(async () => {
    setSaving(true);
    try {
      const last4 = cardNumber.replace(/\D/g, "").slice(-4);
      await setPaymentMethod({
        cardName: cardName.trim(),
        cardNumberLast4: last4 || "****",
        cardNumberFull: cardNumber.replace(/\D/g, "").slice(0, 16),
        expiration: expiration.trim(),
        cvv: cvv.trim(),
        address: billingAddress.trim(),
        zipCode: zipCode.trim(),
        state: state.trim(),
        country: country.trim(),
      });
      router.replace("/(customer)/(tabs)/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save payment method.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [
    cardName,
    cardNumber,
    expiration,
    billingAddress,
    zipCode,
    state,
    country,
    router,
  ]);

  const pickAndUploadImage = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    const {
      data: { session },
    } = await getSession();
    const user = session?.user;
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow access to your photos to set a profile image.",
      );
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

    // Show selected image immediately (local file URI)
    setLocalImageUri(uri);
    setUploadingImage(true);
    try {
      const path = `${user.id}/${AVATAR_PATH_PREFIX}.${ext}`;

      // Use expo-file-system File API to read as ArrayBuffer (fetch(file://) is unreliable in RN)
      const file = new FileSystem.File(uri);
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert("Upload failed", uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      setImageUrl(publicUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload image.";
      Alert.alert("Error", message);
    } finally {
      setUploadingImage(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={c.blue500}
          />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.segmentWrap}>
          <Text style={styles.segmentTitle}>
            {isPaymentMode ? "Payment" : "Profile"}
          </Text>
        </View>

        <View style={styles.avatarWrap}>
          {isPaymentMode ? (
            <>
              {imageUrl ? (
                <Image
                  key={
                    avatarUrlWithCacheBuster(imageUrl, profileUpdatedAt) ??
                    "server"
                  }
                  source={{
                    uri:
                      avatarUrlWithCacheBuster(imageUrl, profileUpdatedAt) ??
                      imageUrl,
                  }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons
                    name="account"
                    size={48}
                    color={c.blue500}
                  />
                </View>
              )}
            </>
          ) : (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={pickAndUploadImage}
              disabled={uploadingImage}
            >
              {localImageUri || imageUrl ? (
                <Image
                  key={
                    localImageUri
                      ? `local:${localImageUri}`
                      : (avatarUrlWithCacheBuster(imageUrl, profileUpdatedAt) ??
                        "server")
                  }
                  source={{
                    uri:
                      localImageUri ??
                      (imageUrl
                        ? (avatarUrlWithCacheBuster(
                            imageUrl,
                            profileUpdatedAt,
                          ) ?? imageUrl)
                        : undefined),
                  }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  {uploadingImage ? (
                    <ActivityIndicator color={c.blue500} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="account"
                        size={48}
                        color={c.blue500}
                      />
                      <Text style={styles.addPhotoLabel}>Add photo</Text>
                    </>
                  )}
                </View>
              )}
            </Pressable>
          )}
        </View>

        {isPaymentMode ? (
          <View style={styles.paymentForm}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name on Credit Card</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="John Doe"
                placeholderTextColor={c.blue500}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Credit Card Number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(t) =>
                  setCardNumber(
                    t
                      .replace(/\D/g, "")
                      .replace(/(\d{4})(?=\d)/g, "$1 ")
                      .slice(0, 19),
                  )
                }
                placeholder="8654 2154 8125 4780"
                placeholderTextColor={c.blue500}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Expiration Date</Text>
                <TextInput
                  style={styles.input}
                  value={expiration}
                  onChangeText={(t) => {
                    const v = t.replace(/\D/g, "").slice(0, 4);
                    if (v.length >= 2)
                      setExpiration(`${v.slice(0, 2)}/${v.slice(2)}`);
                    else setExpiration(v);
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor={c.blue500}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="998"
                  placeholderTextColor={c.blue500}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => {
                const next = !useSameAddress;
                setUseSameAddress(next);
                if (next && address) setBillingAddress(address);
              }}
            >
              <MaterialCommunityIcons
                name={
                  useSameAddress ? "checkbox-marked" : "checkbox-blank-outline"
                }
                size={24}
                color={c.blue500}
              />
              <Text style={styles.checkboxLabel}>
                Use same address from Profile
              </Text>
            </Pressable>
            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={billingAddress}
                onChangeText={setBillingAddress}
                placeholder="Street address"
                placeholderTextColor={c.blue500}
                editable={!useSameAddress}
              />
            </View>
            <View style={styles.rowThree}>
              <View style={styles.fieldThird}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput
                  style={styles.input}
                  value={zipCode}
                  onChangeText={(t) =>
                    setZipCode(t.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10001"
                  placeholderTextColor={c.blue500}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.fieldThird}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="NY"
                  placeholderTextColor={c.blue500}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
              <View style={styles.fieldThird}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="USA"
                  placeholderTextColor={c.blue500}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
              ]}
              onPress={savePayment}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={c.background} size="small" />
              ) : (
                <Text style={styles.saveLabel}>Save</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={c.blue500}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={c.blue500}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={c.blue500}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of Birth</Text>
              <Pressable
                onPress={openDobPicker}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.pressed]}
              >
                <Text
                  style={[
                    styles.dateInputText,
                    !dateOfBirth.trim() && styles.dateInputPlaceholder,
                  ]}
                >
                  {dateOfBirth.trim() ? formatDobDisplay(dateOfBirth) : "dd-mm-yyyy"}
                </Text>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color={c.blue500} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={c.blue500}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <Input
                variant="phone"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
                placeholder="306 1234567"
                placeholderTextColor={c.blue500}
                selectedCca2={countryCode}
                selectedCallingCode={callingCode}
                onCountrySelect={(c) => {
                  setCountryCode(c.cca2);
                  setCallingCode(c.callingCode);
                }}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
              ]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={c.background} size="small" />
              ) : (
                <Text style={styles.saveLabel}>Save</Text>
              )}
            </Pressable>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={dobPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDobPickerVisible(false)}
      >
        <View style={styles.dobOverlay}>
          <Pressable style={styles.dobBackdrop} onPress={() => setDobPickerVisible(false)} />
          <View style={styles.dobCard}>
            <Text style={styles.dobTitle}>Select Date of Birth</Text>
            <View style={styles.dobPickerRow}>
              <ScrollView
                ref={dayWheelRef}
                style={styles.dobWheel}
                contentContainerStyle={styles.dobWheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={DOB_ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, dayOptions.length);
                  setDobDay(dayOptions[idx]);
                }}
                onScrollEndDrag={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, dayOptions.length);
                  setDobDay(dayOptions[idx]);
                }}
              >
                {dayOptions.map((value) => (
                  <View key={`d-${value}`} style={styles.dobItem}>
                    <Text style={[styles.dobItemText, dobDay === value && styles.dobItemTextActive]}>
                      {String(value).padStart(2, "0")}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <ScrollView
                ref={monthWheelRef}
                style={styles.dobWheel}
                contentContainerStyle={styles.dobWheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={DOB_ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, monthOptions.length);
                  setDobMonth(monthOptions[idx]);
                }}
                onScrollEndDrag={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, monthOptions.length);
                  setDobMonth(monthOptions[idx]);
                }}
              >
                {monthOptions.map((value) => (
                  <View key={`m-${value}`} style={styles.dobItem}>
                    <Text style={[styles.dobItemText, dobMonth === value && styles.dobItemTextActive]}>
                      {String(value).padStart(2, "0")}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <ScrollView
                ref={yearWheelRef}
                style={styles.dobWheel}
                contentContainerStyle={styles.dobWheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={DOB_ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, yearOptions.length);
                  setDobYear(yearOptions[idx]);
                }}
                onScrollEndDrag={(event) => {
                  const idx = getSelectedIndex(event.nativeEvent.contentOffset.y, yearOptions.length);
                  setDobYear(yearOptions[idx]);
                }}
              >
                {yearOptions.map((value) => (
                  <View key={`y-${value}`} style={styles.dobItem}>
                    <Text style={[styles.dobItemText, dobYear === value && styles.dobItemTextActive]}>
                      {value}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View pointerEvents="none" style={styles.dobFocusBand} />
            </View>
            <View style={styles.dobActions}>
              <Pressable style={styles.dobActionBtn} onPress={() => setDobPickerVisible(false)}>
                <Text style={styles.dobActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.dobActionBtn, styles.dobActionPrimary]}
                onPress={() => {
                  const iso = `${dobYear}-${String(dobMonth).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
                  setDateOfBirth(iso);
                  setDobPickerVisible(false);
                }}
              >
                <Text style={styles.dobActionTextPrimary}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  backLabel: {
    fontSize: 16,
    color: c.blue500,
    fontWeight: "600",
  },
  segmentWrap: {
    marginBottom: 28,
  },
  segmentTitle: {
    fontSize: 18,
    color: c.white,
    fontWeight: "700",
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: c.blue900,
    alignSelf: "center",
    marginBottom: 28,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.blue900,
  },
  addPhotoLabel: {
    marginTop: 6,
    fontSize: 12,
    color: c.blue500,
  },
  form: {
    gap: 20,
  },
  paymentForm: {
    marginTop: 20,
    gap: 20,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  rowThree: {
    flexDirection: "row",
    gap: 12,
  },
  fieldThird: {
    flex: 1,
    gap: 6,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: c.white,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: c.blue500,
    fontWeight: "500",
  },
  input: {
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.white,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInputText: {
    color: c.white,
    fontSize: 16,
  },
  dateInputPlaceholder: {
    color: c.blue500,
  },
  dobOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dobBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dobCard: {
    backgroundColor: c.blue900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 16,
  },
  dobTitle: {
    fontSize: 16,
    color: c.white,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  dobPickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  dobWheel: {
    flex: 1,
    maxHeight: DOB_ITEM_HEIGHT * DOB_VISIBLE_ROWS,
    borderRadius: 12,
    backgroundColor: c.background,
  },
  dobWheelContent: {
    paddingVertical: DOB_ITEM_HEIGHT * 2,
  },
  dobItem: {
    height: DOB_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  dobItemText: {
    color: c.blue500,
    fontSize: 16,
  },
  dobItemTextActive: {
    color: c.white,
    fontWeight: "700",
  },
  dobFocusBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: DOB_ITEM_HEIGHT * 2,
    height: DOB_ITEM_HEIGHT,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dobActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  dobActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.background,
  },
  dobActionPrimary: {
    backgroundColor: c.blue500,
  },
  dobActionText: {
    color: c.white,
    fontWeight: "600",
  },
  dobActionTextPrimary: {
    color: c.background,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: c.blue500,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  saveLabel: {
    fontSize: 16,
    color: c.background,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
