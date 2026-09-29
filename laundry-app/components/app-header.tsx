import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

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
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  /** Default centers the title; use `left` for screens like Orders. */
  titleAlign?: "center" | "left";
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
  appearance?: "dark" | "light";
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
  titleStyle,
  subtitleStyle,
  titleAlign = "center",
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
  appearance = "dark",
}: AppHeaderProps) {
  const { hideBottomTabBar, isWeb, ms, isNarrow } = useResponsiveLayout();
  const light = appearance === "light";
  const iconColor = light ? "#111827" : c.white;
  const showSubtitle = subtitle != null && subtitle.length > 0;
  const showRightIcon = rightElement == null && rightIcon != null && rightIcon.length > 0;
  const showLeftBrand =
    showBrandLogo && !hideBottomTabBar && leftElement == null && leftIcon == null;
  const showLeftSlot = showLeftBrand || leftElement != null || leftIcon != null;
  const showTitleText = Boolean(title?.trim()) && !(hideTitleOnWeb && isWeb);
  const titleSize = ms(isNarrow ? fs.xSmallText + 2 : fs.smallTitle);
  const iconSize = isNarrow ? 22 : ICON_SIZE;
  const leftTitle = titleAlign === "left";

  if (hideTitleOnWeb && isWeb && !showLeftSlot && rightElement == null && !showRightIcon) {
    return null;
  }

  const titleNode = showTitleText ? (
    <View
      style={[
        leftTitle ? styles.titleWrapLeft : styles.titleWrap,
        leftTitle && showLeftSlot && styles.titleWrapLeftWithSlot,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.titleRow, leftTitle && styles.titleRowLeft]}>
        <Text
          style={[
            styles.title,
            light && styles.titleLight,
            { fontSize: titleSize },
            leftTitle && styles.titleLeft,
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {titleVerified ? <PartnerVerifiedBadge size={11} /> : null}
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.row,
          leftTitle && styles.rowCompact,
          showSubtitle && styles.rowWithSubtitle,
        ]}
      >
        {!leftTitle ? titleNode : null}

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
                style={({ pressed }) => [
                  styles.iconBtn,
                  showSubtitle && styles.iconBtnCompact,
                  pressed && styles.pressed,
                ]}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={leftAccessibilityLabel}
              >
                <MaterialCommunityIcons name={leftIcon} size={iconSize} color={iconColor} />
              </Pressable>
            ) : null
          ) : null}
        </View>

        {leftTitle ? titleNode : <View style={styles.spacer} />}

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
              <MaterialCommunityIcons name={rightIcon!} size={iconSize} color={iconColor} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showSubtitle && showTitleText ? (
        <View style={[styles.subtitleWrap, leftTitle && styles.subtitleWrapLeft]}>
          <Text
            style={[
              styles.subtitle,
              light && styles.subtitleLight,
              leftTitle && styles.subtitleLeft,
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
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
  rowCompact: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  rowWithSubtitle: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 60,
  },
  titleWrapLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  titleWrapLeftWithSlot: {
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
  },
  titleRowLeft: {
    justifyContent: "flex-start",
  },
  title: {
    flexShrink: 1,
    fontSize: fs.smallTitle,
    fontWeight: "700",
    color: c.white,
    textAlign: "center",
  },
  titleLeft: {
    textAlign: "left",
  },
  titleLight: {
    color: "#111827",
  },
  subtitleWrap: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 6,
  },
  subtitleWrapLeft: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 6,
  },
  subtitle: {
    fontSize: fs.smallText,
    color: c.blue500,
    textAlign: "center",
  },
  subtitleLeft: {
    textAlign: "left",
  },
  subtitleLight: {
    color: "#6B7280",
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
  iconBtnCompact: {
    paddingVertical: 4,
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
