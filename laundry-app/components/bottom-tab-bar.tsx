import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import {
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarColors } from "@/constants/theme";

export const TAB_BAR_HEIGHT = 75;
export const TAB_ICON_SIZE = 32;

const TAB_BAR_SHADOW: ViewStyle = {
  shadowColor: TabBarColors.shadow,
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 8,
};

export function BottomTabBarBackground() {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.backgroundShell,
        TAB_BAR_SHADOW,
      ]}
    >
      <View style={styles.topHighlight} />
    </View>
  );
}

export function BottomTabBarButton({
  children,
  style,
  onPressIn,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const focused = Boolean(accessibilityState?.selected);

  return (
    <PlatformPressable
      {...rest}
      accessibilityState={accessibilityState}
      style={[style, styles.tabButton]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    >
      {focused ? <View style={styles.tabGlow} pointerEvents="none" /> : null}
      {children}
    </PlatformPressable>
  );
}

function BottomTabBarLabel({
  focused,
  children,
}: {
  focused: boolean;
  children: string;
}) {
  return (
    <View style={styles.labelWrap}>
      <Text
        style={[
          styles.label,
          { color: focused ? TabBarColors.activeTint : TabBarColors.inactiveTint },
          focused ? styles.labelActive : null,
        ]}
      >
        {children}
      </Text>
      <View
        style={[
          styles.activeDot,
          focused ? styles.activeDotVisible : styles.activeDotHidden,
        ]}
      />
    </View>
  );
}

export function getBottomTabScreenOptions(tabBarBottom: number) {
  const webHeaderSuppression =
    Platform.OS === "web"
      ? {
          headerShown: false as const,
          header: () => null,
          title: "",
          headerTitle: "",
        }
      : { headerShown: false as const };

  return {
    tabBarActiveTintColor: TabBarColors.activeTint,
    tabBarInactiveTintColor: TabBarColors.inactiveTint,
    tabBarStyle: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: TAB_BAR_HEIGHT + tabBarBottom,
      paddingBottom: tabBarBottom,
      backgroundColor: TabBarColors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: TabBarColors.border,
      elevation: 0,
      shadowOpacity: 0,
      overflow: "visible" as const,
    },
    tabBarBackground: () => <BottomTabBarBackground />,
    tabBarLabel: ({
      focused,
      children,
    }: {
      focused: boolean;
      color: string;
      children: string;
    }) => (
      <BottomTabBarLabel focused={focused}>{children}</BottomTabBarLabel>
    ),
    tabBarLabelStyle: {
      fontSize: 11,
      fontFamily: "Poppins-SemiBold",
      letterSpacing: 0.2,
    },
    tabBarIconStyle: {
      width: 44,
      height: 32,
      overflow: "visible" as const,
      marginBottom: 2,
    },
    tabBarItemStyle: {
      paddingTop: 8,
      paddingBottom: 6,
      backgroundColor: "transparent",
      overflow: "visible" as const,
    },
    ...webHeaderSuppression,
    tabBarButton: BottomTabBarButton,
  };
}

/** Total vertical space reserved above the home indicator / screen bottom. */
export function getTabBarBottomInset(tabBarBottom: number, hideTabBar = false) {
  if (hideTabBar) {
    return Math.max(tabBarBottom, 20);
  }
  return TAB_BAR_HEIGHT + tabBarBottom;
}

export function getBottomTabScreenOptionsForPlatform(
  tabBarBottom: number,
  hideTabBar: boolean,
) {
  const base = getBottomTabScreenOptions(tabBarBottom);
  if (!hideTabBar) {
    return base;
  }
  return {
    ...base,
    tabBarStyle: {
      ...base.tabBarStyle,
      display: "none" as const,
      height: 0,
    },
  };
}

export type TabIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type AppTabItem = {
  name: string;
  title: string;
  icon: TabIconName;
  focusedIcon?: TabIconName;
};

function renderTabIcon(
  icon: TabIconName,
  focusedIcon: TabIconName | undefined,
  color: string,
  focused: boolean,
) {
  return (
    <View style={styles.tabIconSlot}>
      <MaterialCommunityIcons
        name={focused ? focusedIcon ?? icon : icon}
        size={TAB_ICON_SIZE}
        color={color}
      />
    </View>
  );
}

/** Shared bottom tabs shell for customer and partner flows. */
export function AppTabsLayout({ tabs, hideTabBar = false }: { tabs: AppTabItem[]; hideTabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs screenOptions={getBottomTabScreenOptionsForPlatform(tabBarBottom, hideTabBar)}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: false,
            tabBarIcon: ({ color, focused }) =>
              renderTabIcon(tab.icon, tab.focusedIcon, color, focused),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backgroundShell: {
    backgroundColor: TabBarColors.background,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: TabBarColors.border,
  },
  tabButton: {
    position: "relative",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  tabGlow: {
    position: "absolute",
    top: 2,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: TabBarColors.activeGlow,
    shadowColor: "#12B886",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  labelWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
  },
  label: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    letterSpacing: 0.1,
  } satisfies TextStyle,
  labelActive: {
    fontFamily: "Poppins-Bold",
  } satisfies TextStyle,
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: TabBarColors.activeTint,
  },
  activeDotVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  activeDotHidden: {
    opacity: 0,
    transform: [{ scale: 0.5 }],
  },
  tabIconSlot: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
});
