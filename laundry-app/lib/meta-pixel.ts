declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Meta Pixel only exists on the web export (see app/+html.tsx); no-ops on native. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}
