import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "@/constants/theme";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { getSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { assets } from "@/assets/assets";

const c = theme.colors;

type ProfileTabId = "qr" | "profile" | "payment";

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

/** Format YYYY-MM-DD to DD/MM/YYYY for display */
function formatDateDisplay(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function CustomerProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTabId>("profile");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      };

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,email,phone,full_name,address,date_of_birth,image_url,updated_at",
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
        });
      } else {
        setProfile(fallback);
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

  // Refetch profile every time this tab gains focus (e.g. after returning from edit-profile)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const email = profile?.email ?? "";
  const phone = profile?.phone ?? "";
  const address = profile?.address ?? "";
  const dateOfBirth = profile?.date_of_birth ?? "";
  const dateDisplay = dateOfBirth ? formatDateDisplay(dateOfBirth) : "";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Segment: QR Code | Profile | Payment */}
        <View style={styles.segmentWrap}>
          <View style={styles.segmentBg}>
            <Pressable
              style={[
                styles.segmentItem,
                activeTab === "profile" && styles.segmentItemActive,
              ]}
              onPress={() => setActiveTab("profile")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  activeTab === "profile" && styles.segmentLabelActive,
                ]}
              >
                Profile
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentItem,
                activeTab === "payment" && styles.segmentItemActive,
              ]}
              onPress={() => setActiveTab("payment")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  activeTab === "payment" && styles.segmentLabelActive,
                ]}
              >
                Payment
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Avatar + Edit */}
        <Pressable
          style={styles.editBtn}
          onPress={() => router.push("/(customer)/edit-profile")}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={18}
            color={c.blue500}
          />
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>
        <View style={styles.headerSection}>
          <View style={styles.avatarWrap}>
            <Image
              key={avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at) ?? "placeholder"}
              source={
                profile?.image_url
                  ? {
                      uri: avatarUrlWithCacheBuster(
                        profile.image_url,
                        profile.updated_at,
                      ) as string,
                      cache: "reload" as const,
                    }
                  : assets.images.profile_placeholder
              }
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.white} size="small" />
          </View>
        ) : activeTab === "profile" ? (
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
          </View>
        ) : activeTab === "qr" ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderLabel}>QR Code</Text>
            <Text style={styles.placeholderText}>
              Your QR code will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderLabel}>Payment</Text>
            <Text style={styles.placeholderText}>
              Add your preferred payment methods here.
            </Text>
          </View>
        )}

        {/* Reset Password */}
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(auth)/reset-password")}
        >
          <MaterialCommunityIcons
            name="key-outline"
            size={18}
            color={c.blue500}
          />
          <Text style={styles.resetLabel}>Reset Password</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  segmentWrap: {
    alignItems: "center",
    marginBottom: 28,
    backgroundColor: "transparent",
  },
  segmentBg: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  segmentItem: {
    width: "50%",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: c.backgroundLight,
  },
  segmentLabel: {
    fontSize: 14,
    color: c.blue500,
    fontWeight: "500",
  },
  segmentLabelActive: {
    color: c.white,
    fontWeight: "700",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: c.blue900,
    borderWidth: 2,
    borderColor: c.blue600,
  },
  avatarWrapPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: c.blue900,
    borderWidth: 2,
    borderColor: c.blue600,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  editBtn: {
    flexDirection: "row",
    alignSelf: "flex-end",
    gap: 6,
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 14,
    color: c.blue500,
    fontWeight: "500",
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  detailsCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: c.blue900,
    marginBottom: 24,
    gap: 20,
  },
  detailRow: {
    flexDirection: "row",
    gap: 24,
  },
  detailRowThree: {
    flexDirection: "row",
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailColThird: {
    flex: 1,
  },
  detailBlock: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: c.blue500,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: c.white,
    fontWeight: "600",
  },
  placeholderCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: c.blue900,
    marginBottom: 24,
  },
  placeholderLabel: {
    fontSize: 15,
    color: c.blue500,
    fontWeight: "600",
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: c.white,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  resetLabel: {
    fontSize: 14,
    color: c.blue500,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.8,
  },
});
