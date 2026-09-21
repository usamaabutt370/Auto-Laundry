import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassTabBarBackground } from "@/components/glass-tab-bar-background";
import { gradients } from "@/constants/theme";

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_FLOAT_MARGIN = 16;
export const TAB_BAR_FLOAT_BOTTOM = 8;
export const TAB_ICON_SIZE = 25;

const PILL_INSET = 10;
const PILL_H_PAD = 36;
/** Leading edge arrives first so the chip stretches toward the next tab. */
const LEAD_TIMING = { duration: 200, easing: Easing.out(Easing.cubic) };
/** Trailing edge lags, then catches up into the compact chip. */
const LAG_TIMING = { duration: 200, easing: Easing.inOut(Easing.cubic) };
const LAG_DELAY = 20;

type TabSlot = { slotX: number; slotW: number; contentW: number };

function compactPill(slot: TabSlot) {
  const width = Math.min(
    Math.max(slot.contentW + PILL_H_PAD, 64),
    Math.max(slot.slotW - 4, 64),
  );
  const x = slot.slotX + Math.max(0, (slot.slotW - width) / 2);
  return { x, width };
}

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<Record<number, TabSlot>>({});
  const pillLeft = useSharedValue(0);
  const pillRight = useSharedValue(0);
  const lastIndex = useRef<number | null>(null);
  const bottomOffset = Math.max(insets.bottom, 10) + TAB_BAR_FLOAT_BOTTOM;
  const activeSlot = slots[state.index];
  const pillReady = Boolean(
    activeSlot && activeSlot.contentW > 0 && activeSlot.slotW > 0,
  );

  useEffect(() => {
    if (!activeSlot || activeSlot.contentW <= 0 || activeSlot.slotW <= 0) {
      return;
    }

    const next = compactPill(activeSlot);
    const nextLeft = next.x;
    const nextRight = next.x + next.width;

    if (lastIndex.current === null) {
      pillLeft.value = nextLeft;
      pillRight.value = nextRight;
      lastIndex.current = state.index;
      return;
    }

    // Ignore onLayout tweaks (font-weight) so they don't cancel the stretch.
    if (lastIndex.current === state.index) {
      return;
    }

    const movingRight = state.index > lastIndex.current;
    lastIndex.current = state.index;

    if (movingRight) {
      pillRight.value = withTiming(nextRight, LEAD_TIMING);
      pillLeft.value = withDelay(LAG_DELAY, withTiming(nextLeft, LAG_TIMING));
    } else {
      pillLeft.value = withTiming(nextLeft, LEAD_TIMING);
      pillRight.value = withDelay(LAG_DELAY, withTiming(nextRight, LAG_TIMING));
    }
  }, [activeSlot, pillLeft, pillRight, state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillLeft.value }],
    width: Math.max(pillRight.value - pillLeft.value, 0),
  }));

  const patchSlot = (index: number, patch: Partial<TabSlot>) => {
    setSlots((prev) => {
      const current = prev[index] ?? { slotX: 0, slotW: 0, contentW: 0 };
      const next = { ...current, ...patch };
      if (
        current.slotX === next.slotX &&
        current.slotW === next.slotW &&
        current.contentW === next.contentW
      ) {
        return prev;
      }
      return { ...prev, [index]: next };
    });
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barDock, { paddingBottom: bottomOffset }]}
    >
      <View style={styles.capsuleHost}>
        <View collapsable={false} style={styles.capsule}>
          <GlassTabBarBackground />
          <View pointerEvents="none" style={styles.capsuleOutline} />
          {pillReady ? (
            <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]}>
              <LinearGradient
                colors={[...gradients.glass]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pillFill}
              />
            </Animated.View>
          ) : null}
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const label =
                typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : options.title ?? route.name;
              const color = focused ? "#111827" : "#111827";

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (focused || event.defaultPrevented) return;
                if (process.env.EXPO_OS === "ios") {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                if (
                  "jumpTo" in navigation &&
                  typeof navigation.jumpTo === "function"
                ) {
                  navigation.jumpTo(route.name);
                } else {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  onLongPress={() =>
                    navigation.emit({ type: "tabLongPress", target: route.key })
                  }
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    patchSlot(index, { slotX: x, slotW: width });
                  }}
                  style={styles.tabItem}
                >
                  <View
                    style={styles.tabContent}
                    onLayout={(event) => {
                      patchSlot(index, {
                        contentW: event.nativeEvent.layout.width,
                      });
                    }}
                  >
                    {options.tabBarIcon?.({
                      focused,
                      color,
                      size: TAB_ICON_SIZE,
                    })}
                    <Text
                      numberOfLines={1}
                      style={[styles.label, { color }]}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function renderGlassTabBar(props: BottomTabBarProps) {
  return <GlassTabBar {...props} />;
}

function renderHiddenTabBar() {
  return null;
}

/** Total vertical space reserved above the home indicator / screen bottom. */
export function getTabBarBottomInset(tabBarBottom: number, hideTabBar = false) {
  if (hideTabBar) {
    return Math.max(tabBarBottom, 20);
  }
  return (
    TAB_BAR_HEIGHT + TAB_BAR_FLOAT_BOTTOM + Math.max(tabBarBottom, 10)
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
    tabBarActiveTintColor: "#FFFFFF",
    tabBarInactiveTintColor: "#111827",
    sceneStyle: { backgroundColor: "transparent" },
    freezeOnBlur: false,
    tabBarStyle: {
      position: "absolute" as const,
      backgroundColor: "transparent",
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: 0,
    },
    ...webHeaderSuppression,
  };
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
export function AppTabsLayout({
  tabs,
  hideTabBar = false,
}: {
  tabs: AppTabItem[];
  hideTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={hideTabBar ? renderHiddenTabBar : renderGlassTabBar}
      screenOptions={getBottomTabScreenOptionsForPlatform(
        tabBarBottom,
        hideTabBar,
      )}
    >
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
  barDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 0,
    paddingHorizontal: TAB_BAR_FLOAT_MARGIN,
  },
  capsuleHost: {
    height: TAB_BAR_HEIGHT,
  },
  capsule: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: "visible",
    backgroundColor: "transparent",
  },
  capsuleOutline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.55)",
  },
  pill: {
    position: "absolute",
    top: PILL_INSET,
    left: 0,
    height: TAB_BAR_HEIGHT - PILL_INSET * 2,
    borderRadius: (TAB_BAR_HEIGHT - PILL_INSET * 2) / 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  pillFill: {
    ...StyleSheet.absoluteFillObject,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconSlot: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    letterSpacing: 0.1,
  } satisfies TextStyle,
});
