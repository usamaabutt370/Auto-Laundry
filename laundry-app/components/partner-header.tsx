import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const c = theme.colors;
const fs = theme.fontSize;

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_SIZE = 24;
const HIT_SLOP = 44;

export interface PartnerHeaderProps {
  /** Center title. Same text size and positioning on all screens. */
  title: string;
  /** Optional subtitle below the title row. Omit or null to hide. */
  subtitle?: string | null;
  /** Left icon name (MaterialCommunityIcons), e.g. "menu", "arrow-left". Pass from screen. */
  leftIcon: IconName;
  /** Called when left icon is pressed. */
  onLeftPress: () => void;
  /** Optional right icon name (MaterialCommunityIcons), e.g. "tune-variant". Omit or null for none. */
  rightIcon?: IconName | null;
  /** Called when right icon is pressed. Only used when rightIcon is set. */
  onRightPress?: () => void;
  /** Optional custom content for the right slot (e.g. LanguageSelector). When set, rightIcon is ignored. */
  rightElement?: React.ReactNode;
  /** Accessibility label for left button. */
  leftAccessibilityLabel?: string;
  /** Accessibility label for right button. */
  rightAccessibilityLabel?: string;
}

/**
 * Reusable header for partner Dashboard and onboarding flow.
 * Layout: [Left icon] [Title – centered] [Right icon or empty].
 * Same title font size, icon size, and positioning everywhere.
 */
export function PartnerHeader({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon = null,
  onRightPress,
  rightElement,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
}: PartnerHeaderProps) {
  const showSubtitle = subtitle != null && subtitle.length > 0;
  const showRightIcon = rightElement == null && rightIcon != null && rightIcon.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.slot}>
          <Pressable
            onPress={onLeftPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={leftAccessibilityLabel}
          >
            <MaterialCommunityIcons
              name={leftIcon}
              size={ICON_SIZE}
              color={c.white}
            />
          </Pressable>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.slot, rightElement != null ? styles.slotRightElement : styles.slotRight]}>
          {rightElement != null
            ? rightElement
            : showRightIcon
              ? (
                <Pressable
                  onPress={onRightPress ?? (() => {})}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={rightAccessibilityLabel}
                >
                  <MaterialCommunityIcons
                    name={rightIcon}
                    size={ICON_SIZE}
                    color={c.white}
                  />
                </Pressable>
                )
              : null}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    width: ICON_SIZE + 16,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  slotRight: {
    alignItems: "flex-end",
  },
  slotRightElement: {
    alignItems: "flex-end",
    minWidth: ICON_SIZE + 16,
    width: undefined,
    flex: 0,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: fs.titleMedium,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
