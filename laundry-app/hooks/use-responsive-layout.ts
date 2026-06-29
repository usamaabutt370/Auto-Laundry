import { Platform, useWindowDimensions } from "react-native";

/** Viewport width at which web switches to desktop layout (sidebar, split panels). */
export const WEB_DESKTOP_BREAKPOINT = 1024;

/** Fraction of the main content area used on desktop web (centered). */
export const WEB_CONSTRAINED_CONTENT_WIDTH_RATIO = 0.5;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isWebDesktop = isWeb && width >= WEB_DESKTOP_BREAKPOINT;
  const isWebTablet = isWeb && width >= 768 && width < WEB_DESKTOP_BREAKPOINT;

  return {
    width,
    height,
    isWeb,
    isWebDesktop,
    isWebTablet,
    /** Bottom tabs are hidden on desktop web; use a smaller content inset. */
    hideBottomTabBar: isWebDesktop,
  };
}

/**
 * Routes that stay full-width in the main panel on desktop web.
 * Everything else is constrained to {@link WEB_CONSTRAINED_CONTENT_WIDTH_RATIO}.
 */
export function shouldUseFullWidthWebContent(
  pathname: string,
  segments: readonly string[],
): boolean {
  const seg = [...segments];

  if (seg.includes("pick-launderer") || pathname.includes("pick-launderer")) {
    return true;
  }

  const tabsIdx = seg.indexOf("(tabs)");
  if (tabsIdx === -1) {
    return false;
  }

  const tabSegment = seg[tabsIdx + 1];
  const isDashboardTab = tabSegment === undefined || tabSegment === "index";
  if (!isDashboardTab) {
    return false;
  }

  return seg.includes("(customer)");
}
