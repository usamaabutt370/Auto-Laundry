import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { TabBarColors } from "@/constants/theme";

export const TAB_BAR_HEIGHT = 64;
export const TAB_ICON_SIZE = 23;

const TAB_BAR_SHADOW: ViewStyle = {
  shadowColor: TabBarColors.shadow,
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 12,
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
      <LinearGradient
        colors={[
          TabBarColors.gradientStart,
          TabBarColors.gradientMid,
          TabBarColors.gradientEnd,
          TabBarColors.gradientAccent,
        ]}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", TabBarColors.frostOverlay]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[TabBarColors.shineOverlay, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.55 }}
        style={styles.shineSweep}
      />
      <View style={styles.topHighlight} />
    </View>
  );
}

export function BottomTabBarButton(props: BottomTabBarButtonProps) {
  const selected = props.accessibilityState?.selected ?? false;

  return (
    <PlatformPressable
      {...props}
      style={[props.style, styles.tabButton]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    >
      {selected ? (
        <>
          <View style={styles.activeGlow} />
          <LinearGradient
            colors={[TabBarColors.activePillStart, TabBarColors.activePillEnd]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.activePill}
          />
          <View style={styles.activePillBorder} />
        </>
      ) : null}
      {props.children}
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
          { color: TabBarColors.activeTint },
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
  return {
    tabBarActiveTintColor: TabBarColors.activeTint,
    tabBarInactiveTintColor: TabBarColors.inactiveTint,
    tabBarStyle: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: TAB_BAR_HEIGHT + tabBarBottom,
      backgroundColor: "transparent",
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      overflow: "hidden" as const,
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
      fontWeight: "600" as const,
      letterSpacing: 0.35,
    },
    tabBarIconStyle: {
      width: TAB_ICON_SIZE + 4,
      height: TAB_ICON_SIZE + 4,
      overflow: "visible" as const,
      marginBottom: 1,
    },
    tabBarItemStyle: {
      paddingTop: 8,
      paddingBottom: 6,
      backgroundColor: "transparent",
    },
    headerShown: false,
    tabBarButton: BottomTabBarButton,
  };
}

/** Total vertical space reserved above the home indicator / screen bottom. */
export function getTabBarBottomInset(tabBarBottom: number) {
  return TAB_BAR_HEIGHT + tabBarBottom;
}

const styles = StyleSheet.create({
  backgroundShell: {
    overflow: "hidden",
  },
  shineSweep: {
    ...StyleSheet.absoluteFillObject,
    width: "70%",
    height: "55%",
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: TabBarColors.topHighlight,
  },
  tabButton: {
    position: "relative",
    overflow: "visible",
  },
  activeGlow: {
    position: "absolute",
    top: 2,
    left: "50%",
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TabBarColors.activeGlow,
    opacity: 0.9,
  },
  activePill: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 4,
    right: 4,
    borderRadius: 8,
  },
  activePillBorder: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 4,
    right: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TabBarColors.activePillBorder,
  },
  labelWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  } satisfies TextStyle,
  labelActive: {
    fontWeight: "700",
    letterSpacing: 0.5,
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
});

export const bottomTabIconStyle = {
  width: TAB_ICON_SIZE,
  height: TAB_ICON_SIZE,
};
