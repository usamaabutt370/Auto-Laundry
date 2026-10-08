import { Share } from "react-native";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.autolaundry.app";

const PARTNER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Public https origin, for example https://tap2laundry.com. Empty until configured. */
export function shareLinkOrigin(): string {
  return trimTrailingSlash(process.env.EXPO_PUBLIC_SHARE_LINK_ORIGIN?.trim() ?? "");
}

export function appStoreUrl(): string {
  return process.env.EXPO_PUBLIC_APP_STORE_URL?.trim() ?? "";
}

export function playStoreUrl(partnerId?: string): string {
  const base =
    process.env.EXPO_PUBLIC_PLAY_STORE_URL?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_PLAY_URL?.trim() ||
    PLAY_STORE_URL;
  if (!partnerId) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}referrer=${encodeURIComponent(`laundererId=${partnerId}`)}`;
}

/** Link to put in a share message. Uses https when a domain is configured. */
export function laundererShareUrl(partnerId: string): string {
  const origin = shareLinkOrigin();
  if (origin) return `${origin}/l/${partnerId}`;
  return `laundryapp://l/${partnerId}`;
}

/** Share the profile URL as text. Passing a URL object makes iOS Copy paste a binary plist. */
export async function shareLaundererProfile(partnerId: string, title: string): Promise<void> {
  const url = laundererShareUrl(partnerId);
  await Share.share({ message: url, title });
}

export function parseLaundererShareId(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const raw = input.trim();
  try {
    const withScheme = raw.includes("://")
      ? raw
      : `https://link.local${raw.startsWith("/") ? raw : `/${raw}`}`;
    const url = new URL(withScheme);
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "l");
    const fromPath = marker >= 0 ? parts[marker + 1] : undefined;
    if (fromPath && PARTNER_ID.test(fromPath)) return fromPath;
    const queryId = url.searchParams.get("id") ?? url.searchParams.get("laundererId");
    if (queryId && PARTNER_ID.test(queryId)) return queryId;
  } catch {
    const match = raw.match(/\/l\/([0-9a-f-]{36})/i);
    if (match && PARTNER_ID.test(match[1])) return match[1];
  }
  return null;
}

/** Rewrite an incoming system URL onto the in-app launderer link route. */
export function nativeIntentPath(path: string): string {
  const id = parseLaundererShareId(path);
  if (!id) return path.startsWith("/") || path.includes("://") ? path : `/${path}`;
  return `/l/${id}`;
}
