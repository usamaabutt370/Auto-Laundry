import { Dimensions, Platform } from "react-native";

// BarFly-style color palette
const colors = {
  background: "#3b7f95",
  backgroundLight: "#78b2cb",
  backgroundDark: "#128197",
  blue900: "#347488",
  blue600: "#B8D4DE",
  blue500: "#D1E8F0",
  /** Light blue for filled buttons / accents (e.g. Add Service) */
  lightBlue: "#65B4CE",
  /** Outline color for bordered elements (e.g. Edit/Remove Service button) */
  outline: "#ABE9FE",
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
    shadowColor: "#000",
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

// Tab bar (dark bar with light icons - matches provided design)
export const TabBarColors = {
  background: "#1A1A1A",
  activeTint: "#E5DCC8",
  inactiveTint: "#9CA3AF",
  addButtonBg: "#1A1A1A",
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
