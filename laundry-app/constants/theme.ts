import { Dimensions, Platform } from "react-native";

// BarFly-style color palette
const colors = {
  background: "#3b7f95",
  backgroundLight: "#78b2cb",
  backgroundDark: "#128197",
  blue900: "#347488",
  blue600: "#B8D4DE",
  blue500: "#D1E8F0",
  /** Light blue for filled/primary buttons (Continue, Add) – matches screenshot #64B5D9 */
  lightBlue: "#64B5D9",
  /** Very light blue border for filled buttons (screenshot #A0D0E9) */
  filledButtonBorder: "#A0D0E9",
  /** Outline color for bordered elements (e.g. Edit/Remove Service button) */
  outline: "#ABE9FE",
  /** Modal overlay (theme background with opacity) */
  modalOverlay: "rgba(59, 127, 149, 0.88)",
  /** Modal card border (subtle light border) */
  modalBorder: "rgba(255, 255, 255, 0.2)",
  /** Dark dim behind bottom sheets / small modals (e.g. period picker). */
  sheetBackdrop: "rgba(0, 0, 0, 0.45)",
  /** Highlight row on teal surfaces (e.g. selected period option). */
  selectionWash: "rgba(59, 127, 149, 0.35)",
  /** Soft shadow under large white type on teal cards. */
  textShadowSoft: "rgba(0, 0, 0, 0.22)",
  /**
   * Translucent primary (light blue) for small icon wells on navy/teal cards.
   * Reads softer than solid blue600 on compact tiles.
   */
  primaryTintSoft: "rgba(100, 181, 217, 0.32)",
  /** Ghost fill on teal/navy surfaces (e.g. “View all” on a panel). */
  onTealFrost6: "rgba(255, 255, 255, 0.06)",
  /** Slightly stronger frost for chips and inset rows on teal cards. */
  onTealFrost10: "rgba(255, 255, 255, 0.1)",
  /** Service mix bar track / empty state (subtle contrast on blue900). */
  onTealTrack: "rgba(255, 255, 255, 0.12)",
  black: "#000000",
  white: "#ffffff",
  themeWhite: "#F9FAFB",
  themeGray: "#667085",
  gray50: "#667085",
  themeBlack: "#1A1A1A",
};

const spacesFrom1 = Array.from({ length: 64 }, (_, i) => i + 1);
const spaces = [0.5, ...spacesFrom1];
const spacesMultiplier = spaces.map((space) => space * 4);

const fontWeights = {
  hairline: "100",
  thin: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
};

const fontSize = {
  inputTitle: 12,
  xxxSmallText: 8,
  xxSmallText: 10,
  descText: 13,
  xSmallText: 14,
  smallText15: 15,
  smallText: 16,
  smallTitle: 18,
  titleMedium: 20,
  titleNormal: 24,
  xNormal: 26,
  titleBig: 28,
  xTitle: 30,
  yTitle: 20,
};

const paddings = {
  top: spacesMultiplier[5],
  horizontal: spacesMultiplier[5],
};

const X_WIDTH = 375;
const X_HEIGHT = 812;
const SE_HEIGHT = 667;
const XSMAX_WIDTH = 414;
const XSMAX_HEIGHT = 896;
const XII_WIDTH = 390;
const XII_HEIGHT = 844;
const XIII_WIDTH = 428;
const XIII_HEIGHT = 926;

const { height, width } = Dimensions.get("window");

const barHeight = () => {
  if (Platform.OS === "ios" && !Platform.isPad) {
    if (width === X_WIDTH && height === X_HEIGHT) return 40;
    if (width === X_WIDTH && height === SE_HEIGHT) return 17;
    if (width === XSMAX_WIDTH && height === XSMAX_HEIGHT) return 41;
    if (width === XII_WIDTH && height === XII_HEIGHT) return 44;
    if (width === XIII_WIDTH && height === XIII_HEIGHT) return 44;
    return 20;
  }
  return 0;
};

const StatusBarHeight = Platform.select({
  ios: barHeight(),
  android: 0,
  default: 0,
});

const dimensions = {
  screenWidth: Dimensions.get("window").width,
  screenHeight: Dimensions.get("window").height,
  statusBar: StatusBarHeight,
  bottomTabs: {
    height: 80,
    paddingBottom: spaces[5],
  },
  headerHeight: Platform.OS === "ios" ? 64 : 50,
  artworkSummary: 140,
  /** White pill search row on partner discovery (pick-launderer); shared sizing for consistency */
  customerPartnerSearchBarMinHeight: 52,
  customerPartnerSearchBarPaddingV: 14,
};

const animations = {
  bottomTabBar: {
    duration: 500,
  },
  discoverOverlay: {
    duration: 500,
  },
  discoverSwipe: {
    duration: 500,
  },
};

const shadow = Platform.select({
  ios: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  android: {
    elevation: 5,
  },
});

// Theme object (BarFly-style)
export const theme = {
  fontFamilies: {
    bold: "System",
    text: "System",
    semibold: "System",
    light: "System",
    boldTitle: "System",
    textLato: "System",
  },
  colors: {
    text: colors.black,
    ...colors,
  },
  space: spacesMultiplier,
  fontWeights,
  paddings,
  dimensions,
  animations,
  fontSize,
  shadow,
};

// Light/dark palettes for useColorScheme and useThemeColor (uses theme colors)
export const Colors = {
  light: {
    text: colors.black,
    background: colors.background,
    tint: colors.background,
    icon: colors.themeGray,
    tabIconDefault: colors.gray50,
    tabIconSelected: colors.background,
    black: colors.black,
  },
  dark: {
    text: colors.themeWhite,
    background: colors.themeBlack,
    tint: colors.themeWhite,
    icon: colors.themeGray,
    tabIconDefault: colors.themeGray,
    tabIconSelected: colors.themeWhite,
    black: colors.themeWhite,
  },
};

// Bottom tab bar — teal gradient aligned with app brand
export const TabBarColors = {
  gradientStart: colors.blue900,
  gradientMid: colors.backgroundDark,
  gradientEnd: colors.background,
  gradientAccent: colors.backgroundLight,
  activeTint: colors.white,
  inactiveTint: colors.white,
  activePillStart: "rgba(255, 255, 255, 0.28)",
  activePillEnd: "rgba(255, 255, 255, 0.08)",
  activePillBorder: "rgba(255, 255, 255, 0.35)",
  activeGlow: "rgba(171, 233, 254, 0.35)",
  frostOverlay: "rgba(255, 255, 255, 0.06)",
  shineOverlay: "rgba(255, 255, 255, 0.12)",
  topHighlight: "rgba(255, 255, 255, 0.4)",
  activeDot: colors.outline,
  shadow: "rgba(18, 129, 151, 0.55)",
  floatMarginH: 0,
  floatMarginBottom: 0,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
