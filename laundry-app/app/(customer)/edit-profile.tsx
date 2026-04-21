import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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

const WHEEL_ITEM_HEIGHT = 40;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(CURRENT_YEAR);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerDay, setPickerDay] = useState(new Date().getDate());

  const yearRef = useRef<FlatList>(null);
  const monthRef = useRef<FlatList>(null);
  const dayRef = useRef<FlatList>(null);

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
    } finally {
      setLoading(false);
    }
  }, []);

  const openDatePicker = useCallback(() => {
    let initialYear = CURRENT_YEAR;
    let initialMonth = new Date().getMonth();
    let initialDay = new Date().getDate();

    if (dateOfBirth) {
      const parts = dateOfBirth.split("-");
      if (parts.length === 3) {
        initialYear = parseInt(parts[0], 10);
        initialMonth = parseInt(parts[1], 10) - 1;
        initialDay = parseInt(parts[2], 10);
      }
    }

    setPickerYear(initialYear);
    setPickerMonth(initialMonth);
    setPickerDay(initialDay);
    setIsDatePickerVisible(true);

    // Precise scroll after modal render
    setTimeout(() => {
      const yIdx = YEARS.indexOf(initialYear);
      if (yIdx !== -1) {
        yearRef.current?.scrollToOffset({
          offset: yIdx * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
      }
      monthRef.current?.scrollToOffset({
        offset: initialMonth * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
      dayRef.current?.scrollToOffset({
        offset: (initialDay - 1) * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, [dateOfBirth]);

  const confirmDatePicker = useCallback(() => {
    const formatted = `${pickerYear}-${String(pickerMonth + 1).padStart(
      2,
      "0",
    )}-${String(pickerDay).padStart(2, "0")}`;
    setDateOfBirth(formatted);
    setIsDatePickerVisible(false);
  }, [pickerYear, pickerMonth, pickerDay]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getWheelIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);

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

      const isPK = countryCode === "PK";
      const isPKValid = isPK && rawPhone.length === 10;

      if (isPK) {
        if (!isPKValid) {
          Alert.alert(
            "Invalid phone",
            "Pakistan mobile number must be 10 digits.",
          );
          setSaving(false);
          return;
        }
      } else if (!phoneNumberObj || !phoneNumberObj.isValid()) {
        Alert.alert(
          "Invalid phone",
          `Please enter a valid mobile number for ${countryCode}.`,
        );
        setSaving(false);
        return;
      }

      const phoneVal = `+${callingCode}${rawPhone}`;

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
                <Pressable onPress={openDatePicker} style={styles.pickerTrigger}>
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      !dateOfBirth && { color: "rgba(255,255,255,0.7)" },
                    ]}
                  >
                    {dateOfBirth || "YYYY-MM-DD"}
                  </Text>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={c.blue500}
                  />
                </Pressable>
              </View>

              <Modal
                transparent
                visible={isDatePickerVisible}
                animationType="fade"
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalCard}>
                    <Text style={styles.pickerTitle}>Select Date of Birth</Text>
                    <View style={styles.wheelContainer}>
                      <View style={styles.wheelHighlight} />

                      {/* Day Wheel */}
                      <FlatList
                        ref={dayRef}
                        data={Array.from(
                          { length: getDaysInMonth(pickerYear, pickerMonth) },
                          (_, i) => i + 1,
                        )}
                        keyExtractor={(item) => `day-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={WHEEL_ITEM_HEIGHT}
                        decelerationRate="fast"
                        onMomentumScrollEnd={(event) => {
                          const maxDays = getDaysInMonth(
                            pickerYear,
                            pickerMonth,
                          );
                          const idx = Math.min(
                            maxDays - 1,
                            Math.max(0, getWheelIndex(event)),
                          );
                          setPickerDay(idx + 1);
                        }}
                        style={styles.wheelList}
                        contentContainerStyle={styles.wheelContent}
                        renderItem={({ item }) => (
                          <View style={styles.wheelItem}>
                            <Text
                              style={[
                                styles.wheelText,
                                item === pickerDay && styles.wheelTextSelected,
                              ]}
                            >
                              {String(item).padStart(2, "0")}
                            </Text>
                          </View>
                        )}
                      />

                      {/* Month Wheel */}
                      <FlatList
                        ref={monthRef}
                        data={MONTH_NAMES}
                        keyExtractor={(item) => `month-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={WHEEL_ITEM_HEIGHT}
                        decelerationRate="fast"
                        onMomentumScrollEnd={(event) => {
                          const idx = Math.min(
                            11,
                            Math.max(0, getWheelIndex(event)),
                          );
                          setPickerMonth(idx);
                        }}
                        style={styles.wheelList}
                        contentContainerStyle={styles.wheelContent}
                        renderItem={({ item, index }) => (
                          <View style={styles.wheelItem}>
                            <Text
                              style={[
                                styles.wheelText,
                                index === pickerMonth &&
                                  styles.wheelTextSelected,
                              ]}
                            >
                              {item.substring(0, 3)}
                            </Text>
                          </View>
                        )}
                      />

                      {/* Year Wheel */}
                      <FlatList
                        ref={yearRef}
                        data={YEARS}
                        keyExtractor={(item) => `year-${item}`}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={WHEEL_ITEM_HEIGHT}
                        decelerationRate="fast"
                        onMomentumScrollEnd={(event) => {
                          const idx = Math.min(
                            YEARS.length - 1,
                            Math.max(0, getWheelIndex(event)),
                          );
                          setPickerYear(YEARS[idx]);
                        }}
                        style={styles.wheelList}
                        contentContainerStyle={styles.wheelContent}
                        renderItem={({ item }) => (
                          <View style={styles.wheelItem}>
                            <Text
                              style={[
                                styles.wheelText,
                                item === pickerYear && styles.wheelTextSelected,
                              ]}
                            >
                              {item}
                            </Text>
                          </View>
                        )}
                      />

                      <View pointerEvents="none" style={styles.wheelFadeTop} />
                      <View pointerEvents="none" style={styles.wheelFadeBottom} />
                    </View>

                    <View style={styles.pickerActions}>
                      <Pressable
                        style={styles.cancelBtn}
                        onPress={() => setIsDatePickerVisible(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.doneBtn}
                        onPress={confirmDatePicker}
                      >
                        <Text style={styles.doneBtnText}>Confirm</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Modal>

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
                  onChangeText={(t) => {
                    let digits = t.replace(/\D/g, "");

                    // Most countries use 0 as a national prefix; we strip it
                    if (digits.startsWith("0")) {
                      digits = digits.slice(1);
                    }

                    const isPK = countryCode === "PK";
                    const maxLength = isPK ? 10 : 15;

                    if (digits.length > maxLength) {
                      digits = digits.slice(0, maxLength);
                    }
                    setPhone(digits);
                  }}
                  placeholder="0300 1234567"
                  placeholderTextColor={c.blue500}
                  selectedCca2={countryCode}
                  selectedCallingCode={callingCode}
                  onCountrySelect={(c) => {
                    setCountryCode(c.cca2);
                    setCallingCode(c.callingCode);

                    // Truncate if too long for new country
                    const isPK = c.cca2 === "PK";
                    const maxLength = isPK ? 10 : 15;
                    if (phone.length > maxLength) {
                      setPhone(phone.slice(0, maxLength));
                    }
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
  pickerTrigger: {
    backgroundColor: c.blue900,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pickerTriggerText: {
    fontSize: 16,
    color: c.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: c.blue900,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerTitle: {
    color: c.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  wheelContainer: {
    flexDirection: "row",
    gap: 10,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    zIndex: 2,
  },
  wheelList: {
    flex: 1,
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
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontWeight: "500",
  },
  wheelTextSelected: {
    color: c.white,
    fontSize: 20,
    fontWeight: "700",
  },
  wheelFadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: WHEEL_ITEM_HEIGHT * 1.5,
    backgroundColor: "transparent",
    zIndex: 3,
  },
  wheelFadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: WHEEL_ITEM_HEIGHT * 1.5,
    backgroundColor: "transparent",
    zIndex: 3,
  },
  pickerActions: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: c.blue500,
    fontSize: 15,
    fontWeight: "600",
  },
  doneBtn: {
    backgroundColor: c.blue500,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  doneBtnText: {
    color: c.background,
    fontSize: 15,
    fontWeight: "700",
  },
});
