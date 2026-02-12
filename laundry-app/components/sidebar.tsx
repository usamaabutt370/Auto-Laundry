import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
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

import { useRouter } from "expo-router";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { useSidebar } from "@/contexts/sidebar-context";
import { assets } from "@/assets/assets";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * (2 / 3);
const OVERLAY_OPACITY = 0.5;

const MENU_ITEMS = [
  {
    id: "recurring",
    label: strings.sidebar.recurringOptions,
    icon: assets.icons.recurring_icon,
  },
  {
    id: "preferences",
    label: strings.sidebar.preferences,
    icon: assets.icons.profile_icon,
  },
  {
    id: "settings",
    label: strings.sidebar.settings,
    icon: assets.icons.setting_icon,
  },
  {
    id: "contact",
    label: strings.sidebar.contactSupport,
    icon: assets.icons.msg_icon,
  },
  {
    id: "faq",
    label: strings.sidebar.faq,
    icon: assets.icons.faq_icon,
  },
  {
    id: "signout",
    label: strings.sidebar.signOut,
    icon: assets.icons.logout_icon,
  },
];

export function Sidebar() {
  const router = useRouter();
  const { isOpen, close } = useSidebar();
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

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
    if (id === "recurring") {
      router.push("/(customer)/recurring");
    } else if (id === "preferences") {
      console.log("preferences");
      // TODO: Preferences logic
    } else if (id === "settings") {
      router.push("/(customer)/settings");
    } else if (id === "contact") {
      router.push("/(customer)/contact-support");
    } else if (id === "faq") {
      router.push("/(customer)/faq");
    } else if (id === "signout") {
      console.log("signout");
      // TODO: Sign out logic
    }
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
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item.id)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Image
                source={item.icon}
                style={styles.menuIcon}
                contentFit="contain"
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.white}
              />
            </Pressable>
          ))}
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
    backgroundColor: "#000",
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  menuItemPressed: {
    opacity: 0.8,
  },
  menuIcon: {
    width: 20,
    height: 20,
    marginRight: 16,
    tintColor: theme.colors.white,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.white,
  },
});
