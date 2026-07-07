import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { PartnerVerifiedBadge } from "@/components/partner-verified-badge";
import { theme } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

const c = theme.colors;
const fs = theme.fontSize;

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_SIZE = 24;
const BRAND_LOGO_SIZE = 32;
const HIT_SLOP = 44;

export interface AppHeaderProps {
  title?: string;
  titleVerified?: boolean;
  subtitle?: string | null;
  /** Tap2Laundry logo on the left (mobile web / native when sidebar is hidden). */
  showBrandLogo?: boolean;
  /** Hide centered title on web only (sidebar labels are enough on desktop). */
  hideTitleOnWeb?: boolean;
  leftIcon?: IconName;
  leftElement?: React.ReactNode;
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
function AppHeaderBrandLogo({
  onPress,
  accessibilityLabel = "Tap2Laundry",
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const logo = (
    <Image
      source={assets.icons.app_icon}
      style={styles.brandLogo}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (onPress == null) {
    return <View style={styles.iconBtn}>{logo}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {logo}
    </Pressable>
  );
}

export function AppHeader({
  title,
  titleVerified = false,
  subtitle,
  showBrandLogo = false,
  hideTitleOnWeb = false,
  leftIcon,
  leftElement,
  onLeftPress,
  rightIcon = null,
  onRightPress,
  rightElement,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
}: AppHeaderProps) {
  const { hideBottomTabBar, isWeb } = useResponsiveLayout();
  const showSubtitle = subtitle != null && subtitle.length > 0;
  const showRightIcon = rightElement == null && rightIcon != null && rightIcon.length > 0;
  const showLeftBrand =
    showBrandLogo && !hideBottomTabBar && leftElement == null && leftIcon == null;
  const showLeftSlot = showLeftBrand || leftElement != null || leftIcon != null;
  const showTitleText = Boolean(title?.trim()) && !(hideTitleOnWeb && isWeb);

  if (hideTitleOnWeb && isWeb && !showLeftSlot && rightElement == null && !showRightIcon) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showTitleText ? (
          <View style={styles.titleWrap} pointerEvents="none">
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {titleVerified ? <PartnerVerifiedBadge size={11} /> : null}
            </View>
          </View>
        ) : null}

        <View style={styles.slot}>
          {showLeftSlot ? (
            leftElement != null ? (
              leftElement
            ) : showLeftBrand ? (
              <AppHeaderBrandLogo
                onPress={onLeftPress}
                accessibilityLabel={leftAccessibilityLabel ?? "Tap2Laundry"}
              />
            ) : leftIcon != null ? (
              <Pressable
                onPress={onLeftPress}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={leftAccessibilityLabel}
              >
                <MaterialCommunityIcons name={leftIcon} size={ICON_SIZE} color={c.white} />
              </Pressable>
            ) : null
          ) : null}
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

      {showSubtitle && showTitleText ? (
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
  },
  title: {
    flexShrink: 1,
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
  brandLogo: {
    width: BRAND_LOGO_SIZE,
    height: BRAND_LOGO_SIZE,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
