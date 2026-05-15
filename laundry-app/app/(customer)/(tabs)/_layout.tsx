import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  bottomTabIconStyle,
  getBottomTabScreenOptions,
} from "@/components/bottom-tab-bar";
import { strings } from "@/constants/strings";
import { assets } from "@/assets/assets";

export default function CustomerTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs screenOptions={getBottomTabScreenOptions(tabBarBottom)}>
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.customer.home,
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
          title: strings.tabs.customer.order,
          tabBarIcon: ({ color }) => (
            <Image
              source={assets.icons.order_icon}
              style={[bottomTabIconStyle, { tintColor: color }]}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: strings.tabs.customer.chat,
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
          title: strings.tabs.customer.profile,
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
