import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_SIZE = 24;
const HIT_SLOP = 44;

export interface AppHeaderProps {
  title?: string;
  subtitle?: string | null;
  leftIcon?: IconName;
  onLeftPress?: () => void;
  rightIcon?: IconName | null;
  onRightPress?: () => void;
  rightElement?: React.ReactNode;
  leftAccessibilityLabel?: string;
  rightAccessibilityLabel?: string;
}

/**
 * Generic app header layout:
 * [left icon] [center title] [right icon/element].
 */
export function AppHeader({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon = null,
  onRightPress,
  rightElement,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
}: AppHeaderProps) {
  const showSubtitle = subtitle != null && subtitle.length > 0;
  const showRightIcon = rightElement == null && rightIcon != null && rightIcon.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.slot}>
          {leftIcon != null && (
            <Pressable
              onPress={onLeftPress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={leftAccessibilityLabel}
            >
              <MaterialCommunityIcons name={leftIcon} size={ICON_SIZE} color={c.white} />
            </Pressable>
          )}
        </View>

        <View style={styles.spacer} />

        <View style={[styles.slotRight, rightElement != null && styles.slotRightElement]}>
          {rightElement != null ? (
            rightElement
          ) : showRightIcon ? (
            <Pressable
              onPress={onRightPress ?? (() => { })}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={rightAccessibilityLabel}
            >
              <MaterialCommunityIcons name={rightIcon} size={ICON_SIZE} color={c.white} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showSubtitle ? (
        <View style={styles.subtitleWrap}>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 60,
  },
  title: {
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
  },
  subtitleWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.blue500,
  },
  slot: {
    zIndex: 1,
  },
  spacer: {
    flex: 1,
  },
  slotRight: {
    alignItems: "flex-end",
    zIndex: 1,
  },
  slotRightElement: {
    minWidth: ICON_SIZE + 16,
  },
  iconBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
