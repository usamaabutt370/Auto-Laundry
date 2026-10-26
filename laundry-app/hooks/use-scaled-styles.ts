import { useMemo } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { createScaleFns, type ScaleFn } from "@/utils/ui-scale";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export type ScaledStyleHelpers = {
  s: ScaleFn;
  ms: ScaleFn;
  uiScale: number;
  isNarrow: boolean;
  width: number;
};

/**
 * Build StyleSheet values that react to screen width.
 * Prefer this over module-level StyleSheet.create for density-sensitive layouts.
 */
export function useScaledStyles<T extends NamedStyles<T>>(
  factory: (helpers: ScaledStyleHelpers) => T | NamedStyles<T>,
  deps: readonly unknown[] = [],
): T {
  const { width, uiScale, isNarrow, s, ms } = useResponsiveLayout();
  return useMemo(
    () =>
      StyleSheet.create(
        factory({ s, ms, uiScale, isNarrow, width }) as T | NamedStyles<T>,
      ) as T,
    // Intentionally include scale helpers derived from width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, uiScale, isNarrow, ...deps],
  );
}

/** One-shot factory when you already have width (e.g. outside hooks). */
export function createScaledStyleSheet<T extends NamedStyles<T>>(
  width: number,
  factory: (helpers: ScaledStyleHelpers) => T | NamedStyles<T>,
): T {
  const { s, ms, uiScale, isNarrow } = createScaleFns(width);
  return StyleSheet.create(
    factory({ s, ms, uiScale, isNarrow, width }) as T | NamedStyles<T>,
  ) as T;
}
