import { Tabs } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";

export default function PartnerTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.background,
        tabBarInactiveTintColor: theme.colors.gray50,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 56 + tabBarBottom,
          backgroundColor: "transparent",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBackground]} />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarItemStyle: {
          paddingVertical: 5,
          backgroundColor: "transparent",
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.partner.dashboard,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.home_icon}
              style={[styles.tabIcon, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="order"
        options={{
          title: strings.tabs.partner.orders,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="list.bullet" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: strings.tabs.partner.chat,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.msg_icon}
              style={[styles.tabIcon, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.partner.profile,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.profile_icon}
              style={[styles.tabIcon, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    backgroundColor: theme.colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
});
