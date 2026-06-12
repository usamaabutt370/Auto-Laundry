import { Tabs } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  bottomTabIconStyle,
  getBottomTabScreenOptionsForPlatform,
} from "@/components/bottom-tab-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { assets } from "@/assets/assets";
import { strings } from "@/constants/strings";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

export default function PartnerTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);
  const { hideBottomTabBar } = useResponsiveLayout();

  return (
    <Tabs screenOptions={getBottomTabScreenOptionsForPlatform(tabBarBottom, hideBottomTabBar)}>
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.partner.dashboard,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.home_icon}
              style={[bottomTabIconStyle, { tintColor: color }]}
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
            <IconSymbol size={22} name="list.bullet" color={color} />
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
              style={[bottomTabIconStyle, { tintColor: color }]}
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
              style={[bottomTabIconStyle, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
