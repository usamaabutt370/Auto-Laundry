import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assets } from "@/assets/assets";
import { AppButton } from "@/components/ui/button";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const fs = theme.fontSize;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * (2 / 3);
const OVERLAY_OPACITY = 0.5;

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  image_url?: string | null;
  updated_at?: string | null;
};

const MENU_ITEMS: {
  id: string;
  label: string;
  icon:
    | "file-document-outline"
    | "cog-outline"
    | "account-outline"
    | "view-dashboard-outline"
    | "help-circle-outline"
    | "chat-question-outline";
}[] = [
  {
    id: "order",
    label: strings.partner.sidebar.order,
    icon: "file-document-outline",
  },
  {
    id: "settings",
    label: strings.partner.sidebar.settings,
    icon: "cog-outline",
  },
  {
    id: "profile",
    label: strings.partner.sidebar.profile,
    icon: "account-outline",
  },
  {
    id: "dashboard",
    label: strings.partner.sidebar.dashboard,
    icon: "view-dashboard-outline",
  },
  {
    id: "support",
    label: strings.partner.sidebar.support,
    icon: "help-circle-outline",
  },
  {
    id: "faq",
    label: strings.partner.sidebar.faq,
    icon: "chat-question-outline",
  },
];

export function PartnerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name,last_name,email,image_url,updated_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();
    if (data) setProfile(data);
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -SIDEBAR_WIDTH, {
      duration: 250,
    });
    overlayOpacity.value = withTiming(isOpen ? OVERLAY_OPACITY : 0, {
      duration: 250,
    });
  }, [isOpen, translateX, overlayOpacity]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleItemPress = (id: string) => {
    close();
    if (id === "order") router.push("/(partner)/order");
    else if (id === "settings") router.push("/(partner)/settings");
    else if (id === "profile") router.push("/(partner)/profile");
    else if (id === "dashboard") router.push("/(partner)");
    else if (id === "support") router.push("/(partner)/support");
    else if (id === "faq") router.push("/(partner)/faq");
  };

  const handleSettingsFromProfile = () => {
    close();
    router.push("/(partner)/settings");
  };

  const handleStartOnboarding = () => {
    close();
    router.push("/(partner)/onboarding");
  };

  const displayName =
    profile?.first_name || profile?.last_name
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
      : "Launderer";
  const displayEmail = profile?.email || user?.email || "—";
  const avatarUrl = profile?.image_url
    ? avatarUrlWithCacheBuster(profile.image_url, profile.updated_at)
    : undefined;

  const isActive = (id: string) => {
    const p = pathname ?? "";
    const partnerSegment = "(partner)";
    if (id === "dashboard")
      return (
        p.includes(partnerSegment) &&
        !/\/order|\/settings|\/profile|\/support|\/faq|\/onboarding|\/\(tabs\)/.test(
          p,
        )
      );
    if (id === "order") return p.includes("/order");
    if (id === "settings") return p.includes("/settings");
    if (id === "profile") return p.includes("/profile");
    if (id === "support") return p.includes("/support");
    if (id === "faq") return p.includes("/faq");
    return false;
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.container}>
        <Animated.View
          style={[styles.overlay, overlayStyle]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
            sidebarStyle,
          ]}
        >
          {/* Profile header */}
          <View style={styles.profileRow}>
            <Image
              source={
                avatarUrl
                  ? { uri: avatarUrl, cache: "reload" as const }
                  : assets.images.profile_placeholder
              }
              style={styles.avatar}
            />
            <View style={styles.profileTextWrap}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {displayEmail}
              </Text>
            </View>
            <Pressable
              onPress={handleSettingsFromProfile}
              style={({ pressed }) => [
                styles.settingsIconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={theme.colors.white}
              />
            </Pressable>
          </View>

          <Text style={styles.menuHeader}>{strings.partner.sidebar.menu}</Text>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item.id)}
              style={({ pressed }) => [
                styles.menuItem,
                isActive(item.id) && styles.menuItemActive,
                pressed && styles.menuItemPressed,
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={
                  isActive(item.id)
                    ? theme.colors.background
                    : theme.colors.white
                }
              />
              <Text
                style={[
                  styles.menuLabel,
                  isActive(item.id) && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}

          <AppButton
            label={strings.partner.dashboard.placeholderButton}
            onPress={handleStartOnboarding}
            variant="placeholder"
            rightIcon="arrow-right"
            fullWidth
            style={styles.onboardingBtn}
            accessibilityLabel={strings.partner.dashboard.placeholderButton}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: theme.colors.blue900,
  },
  profileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: fs.smallText,
    fontWeight: "700",
    color: theme.colors.white,
  },
  profileEmail: {
    fontSize: fs.descText,
    color: theme.colors.blue500,
    marginTop: 2,
  },
  settingsIconBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  menuHeader: {
    fontSize: fs.xSmallText,
    fontWeight: "600",
    color: theme.colors.blue500,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: theme.colors.blue500,
  },
  menuItemPressed: {
    opacity: 0.8,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: fs.smallText,
    fontWeight: "500",
    color: theme.colors.white,
  },
  menuLabelActive: {
    color: theme.colors.background,
    fontWeight: "600",
  },
  onboardingBtn: {
    marginTop: 14,
  },
});
