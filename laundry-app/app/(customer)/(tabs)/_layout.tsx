import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { strings } from "@/constants/strings";
import { theme } from "@/constants/theme";
import { assets } from "@/assets/assets";

const TAB_ICON_SIZE = 22;
const TAB_BAR_HEIGHT = 56;
const TAB_BAR_TOP_RADIUS = 24;

export default function CustomerTabsLayout() {
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
          height: TAB_BAR_HEIGHT + tabBarBottom,
          backgroundColor: "transparent",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.tabBarBackground,
              {
                borderTopLeftRadius: TAB_BAR_TOP_RADIUS,
                borderTopRightRadius: TAB_BAR_TOP_RADIUS,
              },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          width: TAB_ICON_SIZE,
          height: TAB_ICON_SIZE,
          overflow: "hidden",
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
          title: strings.tabs.customer.home,
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
          title: strings.tabs.customer.order,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.order_icon}
              style={[styles.tabIcon, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.customer.profile,
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
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
});
