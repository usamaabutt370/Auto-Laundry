import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useSegments } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { theme } from "@/constants/theme";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  notifyProfileAvatarUpdated,
} from "@/lib/profile-avatar-refresh";
import { getPaymentMethod, setPaymentMethod } from "@/lib/payment-storage";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { prepareImageForUpload } from "@/utils/read-local-image-bytes";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { Input } from "@/components";

const c = theme.colors;

const AVATAR_BUCKET = "avatars";
const AVATAR_PATH_PREFIX = "avatar"; // file will be avatar.jpg or avatar.png

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  address?: string | null;
  image_url?: string | null;
  updated_at?: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isPaymentMode = mode === "payment";
  const profileRoute =
    segments[0] === "(partner)"
      ? "/(partner)/(tabs)/profile"
      : "/(customer)/(tabs)/profile";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
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
          "first_name,last_name,email,phone,full_name,address,image_url,updated_at",
        )
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!error && data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setAddress(data.address ?? "");
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

      if (!rawPhone) {
        showAppAlert(
          "Missing required fields",
          "Phone is required to save your profile.",
        );
        setSaving(false);
        return;
      }

      if (!phoneNumberObj || !phoneNumberObj.isValid()) {
        showAppAlert(
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
        email: emailVal,
        phone: phoneVal,
        image_url: imageUrl || null,
        updated_at: now,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "id" });

      if (error) {
        showAppAlert(
          "Error",
          error.message || "Could not save profile. Please try again.",
        );
      } else {
        setProfileUpdatedAt(now);
        setLocalImageUri(null);
        notifyProfileAvatarUpdated();
        // Navigate to profile tab so it refetches and shows updated image
        router.replace(profileRoute);
      }
    } catch (err) {
      console.warn("[EditProfile] Save exception:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      showAppAlert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [
    firstName,
    lastName,
    address,
    email,
    phone,
    imageUrl,
    router,
    profileRoute,
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
      router.replace(profileRoute);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save payment method.";
      showAppAlert("Error", message);
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
    profileRoute,
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
      showAppAlert(
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
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;

    // Show selected image immediately (local file URI)
    setLocalImageUri(uri);
    setUploadingImage(true);
    try {
      const { bytes: arrayBuffer, ext, contentType } = await prepareImageForUpload(
        uri,
        asset.mimeType,
      );
      const path = `${user.id}/${AVATAR_PATH_PREFIX}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        showAppAlert("Upload failed", uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          image_url: publicUrl,
          updated_at: now,
        })
        .eq("id", user.id);

      if (updateError) {
        showAppAlert("Update failed", updateError.message);
        return;
      }

      // If the user is editing from the partner flow, also sync the new image
      // into partner_profiles so the partner Profile tab (which reads that
      // table first) shows the updated photo immediately on next focus.
      if (segments[0] === "(partner)") {
        await supabase
          .from("partner_profiles")
          .update({ image_url: publicUrl, updated_at: now })
          .eq("id", user.id);
      }

      setImageUrl(publicUrl);
      setProfileUpdatedAt(now);
      setLocalImageUri(null);
      notifyProfileAvatarUpdated();
      showAppAlert("Success", "Profile image updated successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload image.";
      showAppAlert("Error", message);
    } finally {
      setUploadingImage(false);
    }
  }, [segments]);

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
        <AppHeader
          title={isPaymentMode ? "Payment" : "Profile"}
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
                editable={false}
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
});
