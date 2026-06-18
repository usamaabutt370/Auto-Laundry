type FontWeightValue =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

// BarFly-style color palette
const colors = {
  background: "#3b7f95",
  backgroundLight: "#78b2cb",
  backgroundDark: "#128197",
  sidebarBackground: "#08758B",
  blue900: "#347488",
  blue600: "#B8D4DE",
  blue500: "#D1E8F0",
  secondary: "#65B4CE",
  lightBlue: "#128197",
  filledButtonBorder: "#A0D0E9",
  outline: "#ABE9FE",
  modalOverlay: "rgba(59, 127, 149, 0.88)",
  modalBorder: "rgba(255, 255, 255, 0.2)",
  black: "#000000",
  white: "#ffffff",
  themeWhite: "#F9FAFB",
  themeGray: "#667085",
  gray50: "#667085",
  themeBlack: "#1A1A1A",
} as const;

const spacesFrom1 = Array.from({ length: 64 }, (_, i) => i + 1);
const spaces = [0.5, ...spacesFrom1];
const spacesMultiplier = spaces.map((space) => space * 4);

const fontWeights: Record<string, FontWeightValue> = {
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
} as const;

const paddings = {
  top: spacesMultiplier[5],
  horizontal: spacesMultiplier[5],
} as const;

// React Native-specific device probing is intentionally removed for web.
const dimensions = {
  screenWidth: 1440,
  screenHeight: 900,
  statusBar: 0,
  bottomTabs: {
    height: 80,
    paddingBottom: spaces[5],
  },
  headerHeight: 64,
  artworkSummary: 140,
} as const;

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
} as const;

const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
} as const;

export const theme = {
  fontFamilies: {
    bold: "var(--font-comfortaa), system-ui, sans-serif",
    text: "var(--font-comfortaa), system-ui, sans-serif",
    semibold: "var(--font-comfortaa), system-ui, sans-serif",
    light: "var(--font-comfortaa), system-ui, sans-serif",
    boldTitle: "var(--font-comfortaa), system-ui, sans-serif",
    textLato: "var(--font-comfortaa), system-ui, sans-serif",
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
} as const;

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
} as const;

export const TabBarColors = {
  background: "#1A1A1A",
  activeTint: "#E5DCC8",
  inactiveTint: "#9CA3AF",
  addButtonBg: "#1A1A1A",
} as const;

export const Fonts = {
  sans: "var(--font-comfortaa), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  rounded:
    "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  mono: "var(--font-geist-mono), SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;

export type AppTheme = typeof theme;
