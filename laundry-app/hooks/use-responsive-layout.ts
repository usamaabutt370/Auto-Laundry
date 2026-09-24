import { Platform, useWindowDimensions } from "react-native";
import { useMemo } from "react";

import { createScaleFns } from "@/utils/ui-scale";

/** Viewport width at which web switches to desktop layout (sidebar, split panels). */
export const WEB_DESKTOP_BREAKPOINT = 1024;

/** Fraction of the main content area used on desktop web (centered). */
export const WEB_CONSTRAINED_CONTENT_WIDTH_RATIO = 0.5;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isWebDesktop = isWeb && width >= WEB_DESKTOP_BREAKPOINT;
  const isWebTablet = isWeb && width >= 768 && width < WEB_DESKTOP_BREAKPOINT;
  const scaleFns = useMemo(() => createScaleFns(width), [width]);

  return {
    width,
    height,
    isWeb,
    isWebDesktop,
    isWebTablet,
    /** Bottom tabs are hidden on desktop web; use a smaller content inset. */
    hideBottomTabBar: isWebDesktop,
    /** True on SE-class / small Android widths (&lt; 375). */
    isNarrow: scaleFns.isNarrow,
    /** 0.85–1.0 shrink factor from 375pt design width. */
    uiScale: scaleFns.uiScale,
    /** Scale layout chrome (images, paddings, control widths). */
    s: scaleFns.s,
    /** Milder scale for fonts. */
    ms: scaleFns.ms,
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
