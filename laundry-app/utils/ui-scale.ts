/**
 * Width-based UI scaling for compact phones.
 * Base design width: iPhone X / 375pt. Values are clamped so tablets/web
 * do not enlarge — this is a shrink-on-narrow helper only.
 */

export const UI_SCALE_BASE_WIDTH = 375;

/** Below this width we treat the device as narrow (SE-class / small Android). */
export const UI_NARROW_WIDTH = 375;

const MIN_SCALE = 0.85;
const MAX_SCALE = 1;

export function getUiScale(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / UI_SCALE_BASE_WIDTH));
}

export function isNarrowWidth(width: number): boolean {
  return width > 0 && width < UI_NARROW_WIDTH;
}

/** Linear scale from design px → device px (clamped). */
export function scale(size: number, width: number): number {
  return Math.round(size * getUiScale(width));
}

/**
 * Softer scale for fonts: less aggressive than layout chrome so type stays readable.
 * @param factor 0 = no scale, 1 = full scale (default 0.45)
 */
export function moderateScale(size: number, width: number, factor = 0.45): number {
  const uiScale = getUiScale(width);
  return Math.round(size + (uiScale - 1) * size * factor);
}

export type ScaleFn = (size: number) => number;

export function createScaleFns(width: number): {
  s: ScaleFn;
  ms: ScaleFn;
  uiScale: number;
  isNarrow: boolean;
} {
  const uiScale = getUiScale(width);
  return {
    uiScale,
    isNarrow: isNarrowWidth(width),
    s: (size) => scale(size, width),
    ms: (size) => moderateScale(size, width),
  };
}
