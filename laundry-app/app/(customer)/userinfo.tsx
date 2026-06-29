import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { showAppAlert } from "@/components/app-alert";
import { AppHeader } from "@/components/app-header";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { fetchPartnerOnboardingRequest } from "@/lib/partner-onboarding-request";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/user";
import { AvatarImage } from "@/components/avatar-image";
import { useConfirmDialog } from "@/components/confirm-dialog";

const c = theme.colors;

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
  role?: string | null;
};

function formatDateDisplay(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function UserInfo() {
  const router = useRouter();
  const { user, refreshRole } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleSwitchValue, setRoleSwitchValue] = useState<boolean | null>(null);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await getSession();
      const user = session?.user;
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const fallback: ProfileRow = {
        first_name: (meta.first_name as string) ?? null,
        last_name: (meta.last_name as string) ?? null,
        email: user.email ?? (meta.email as string) ?? null,
        phone: (meta.phone as string) ?? null,
        full_name: (meta.full_name as string) ?? null,
        address: null,
        date_of_birth: null,
        image_url: null,
        updated_at: null,
        role: "customer",
      };

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,email,phone,full_name,address,date_of_birth,image_url,updated_at,role",
        )
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (error) {
        setProfile(fallback);
        setIsLoading(false);
        return;
      }

      if (data) {
        setProfile({
          first_name: data.first_name ?? fallback.first_name,
          last_name: data.last_name ?? fallback.last_name,
          email: data.email ?? fallback.email ?? user.email ?? null,
          phone: data.phone ?? fallback.phone,
          full_name: data.full_name ?? fallback.full_name,
          address: data.address ?? fallback.address,
          date_of_birth: data.date_of_birth ?? fallback.date_of_birth,
          image_url: data.image_url ?? fallback.image_url ?? null,
          updated_at: data.updated_at ?? fallback.updated_at ?? null,
          role: data.role ?? fallback.role ?? "customer",
        });
        setRoleSwitchValue(null);
      } else {
        setProfile(fallback);
        setRoleSwitchValue(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const performRoleUpdate = useCallback(
    async (value: boolean) => {
      if (!user?.id || !isSupabaseConfigured() || isUpdatingRole) return;
      const newRole: UserRole = value ? "launderer" : "customer";
      setRoleSwitchValue(value);
      setIsUpdatingRole(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (error) throw error;
        await refreshRole();
        let destination:
          | "/(partner)"
          | "/(partner)/onboarding?from=role_switch&returnTo=customer_userinfo"
          | "/(customer)" = value
          ? "/(partner)"
          : "/(customer)";
        if (value) {
          const { data: onboardingRequest, error: onboardingError } =
            await fetchPartnerOnboardingRequest(user.id);
          if (onboardingError) throw onboardingError;
          if (!onboardingRequest) {
            const { data: partnerProfile, error: partnerProfileError } = await supabase
              .from("partner_profiles")
              .select("id")
              .eq("id", user.id)
              .maybeSingle();
            if (partnerProfileError) throw partnerProfileError;
            if (!partnerProfile) {
              destination = "/(partner)/onboarding?from=role_switch&returnTo=customer_userinfo";
            }
          }
        }
        const delayMs = 320;
        await new Promise((r) => setTimeout(r, delayMs));
        router.replace(destination);
      } catch (err) {
        setRoleSwitchValue(!value);
        const message = err instanceof Error ? err.message : "Could not update role.";
        showAppAlert("Error", message);
      } finally {
        setIsUpdatingRole(false);
      }
    },
    [user?.id, isUpdatingRole, refreshRole, router],
  );

  const handleRoleToggle = useCallback(
    async (value: boolean) => {
      if (!user?.id || !isSupabaseConfigured() || isUpdatingRole) return;

      if (value) {
        const { data: onboardingRequest, error: onboardingError } =
          await fetchPartnerOnboardingRequest(user.id);
        if (onboardingError) {
          showAppAlert("Error", onboardingError.message);
          return;
        }
        const { data: partnerProfile, error: partnerProfileError } = await supabase
          .from("partner_profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (partnerProfileError) {
          showAppAlert("Error", partnerProfileError.message);
          return;
        }
        const isFirstTimeBecomingLaunderer = !onboardingRequest && !partnerProfile;

        if (isFirstTimeBecomingLaunderer) {
          setRoleSwitchValue(true);
          const confirmed = await confirm({
            title: "Become a Laundry Captain",
            message: "Are you sure you want to become a Laundry Captain? You will be asked to provide your business details.",
            confirmLabel: "Confirm",
            cancelLabel: "Cancel",
          });
          if (confirmed) {
            performRoleUpdate(true);
          } else {
            setRoleSwitchValue(false);
          }
          return;
        }

        performRoleUpdate(true);
      } else {
        performRoleUpdate(false);
      }
    },
    [user?.id, isUpdatingRole, performRoleUpdate, confirm],
  );

  const isPartnerSwitchOn =
    roleSwitchValue !== null ? roleSwitchValue : profile?.role === "launderer";

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const email = profile?.email ?? "";
  const phone = profile?.phone ?? "";
  const address = profile?.address ?? "";
  const dateOfBirth = profile?.date_of_birth ?? "";
  const dateDisplay = dateOfBirth ? formatDateDisplay(dateOfBirth) : "";

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <AppHeader
          title="Profile"
          leftIcon="arrow-left"
          onLeftPress={() => router.back()}
          rightElement={
            <Pressable
              onPress={() => router.push("/(customer)/edit-profile")}
              style={({ pressed }) => [styles.editBtnHeader, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="cog-outline" size={18} color={c.white} />
              <Text style={[styles.editLabel, styles.editLabelWhite]}>Edit</Text>
            </Pressable>
          }
          rightAccessibilityLabel="Edit profile"
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.headerSection}>
          <View style={styles.avatarWrap}>
            <AvatarImage
              key={avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at) ?? "initials"}
              uri={profile?.image_url ? avatarUrlWithCacheBuster(profile.image_url, profile.updated_at) : null}
              name={profile?.full_name ?? [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}
              size={80}
              style={styles.avatar}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.white} size="small" />
          </View>
        ) : (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>First Name</Text>
                <Text style={styles.detailValue}>{firstName || "-"}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Last Name</Text>
                <Text style={styles.detailValue}>{lastName || "-"}</Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{address || "-"}</Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Date of Birth</Text>
              <Text style={styles.detailValue}>{dateDisplay || "-"}</Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{email || "-"}</Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{phone || "-"}</Text>
            </View>

            <View style={styles.roleCard}>
              <Pressable style={({ pressed }) => [styles.roleRow, pressed && styles.pressed]} onPress={() => !isUpdatingRole && handleRoleToggle(!isPartnerSwitchOn)}>
                <Text style={styles.roleLabel}>Become a Laundry Captain</Text>
                <View style={styles.switchWrap}>
                  {isUpdatingRole ? (
                    <ActivityIndicator color={c.white} size="small" />
                  ) : (
                    <Switch
                      value={isPartnerSwitchOn}
                      onValueChange={handleRoleToggle}
                      disabled={isUpdatingRole}
                      trackColor={{ false: c.blue900, true: c.blue600 }}
                      thumbColor={c.white}
                      ios_backgroundColor={c.backgroundLight}
                    />
                  )}
                </View>
              </Pressable>
              <Text style={styles.roleHint}>
                Offer laundry services and manage orders as a Laundry Captain.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/reset-password")}
        >
          <MaterialCommunityIcons name="key-outline" size={18} color={c.blue500} />
          <Text style={styles.resetLabel}>Reset Password</Text>
        </Pressable>
      </ScrollView>
      {confirmDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: c.white },
  editBtnHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  safeTop: { paddingHorizontal: 24, paddingBottom: 8 },
  headerSpacer: { width: 32 },
  pressed: { opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  editBtn: { flexDirection: "row", alignSelf: "flex-end", gap: 6, marginBottom: 24 },
  editLabel: { fontSize: 14, color: c.blue500, fontWeight: "500" },
  editLabelWhite: { color: c.white },
  headerSection: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 28, position: "relative" },
  avatarWrap: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", backgroundColor: c.blue900, borderWidth: 2, borderColor: c.blue600 },
  avatar: { width: "100%", height: "100%" },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  detailsCard: { paddingVertical: 24, paddingHorizontal: 20, borderRadius: 16, backgroundColor: c.blue900, marginBottom: 24, gap: 20 },
  detailRow: { flexDirection: "row", gap: 24 },
  detailCol: { flex: 1 },
  detailBlock: { gap: 4 },
  roleCard: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", gap: 10 },
  roleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleLabel: { fontSize: 17, color: c.white, fontWeight: "700", flex: 1 },
  switchWrap: { transform: [{ scale: 1.12 }] },
  roleHint: { fontSize: 13, color: c.blue500, lineHeight: 18 },
  detailLabel: { fontSize: 13, color: c.blue500, marginBottom: 2 },
  detailValue: { fontSize: 16, color: c.white, fontWeight: "600" },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  resetLabel: { fontSize: 14, color: c.blue500, fontWeight: "500" },
});
