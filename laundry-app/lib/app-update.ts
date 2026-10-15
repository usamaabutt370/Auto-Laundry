import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

import { appStoreUrl, playStoreUrl } from "@/lib/launderer-share-link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const DISMISS_KEY_PREFIX = "app_update_dismissed:";

export type AppUpdateKind = "force" | "soft";

export type AppUpdateConfig = {
  latestVersion: string;
  minSupportedVersion: string;
  title: string | null;
  message: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
};

export type AppUpdatePrompt = {
  kind: AppUpdateKind;
  config: AppUpdateConfig;
  installedVersion: string;
  storeUrl: string;
};

type ConfigRow = {
  latest_version: string;
  min_supported_version: string;
  title: string | null;
  message: string | null;
  ios_store_url: string | null;
  android_store_url: string | null;
};

/** Compare semver-ish versions. Returns -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .trim()
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .filter(Boolean)
      .map((part) => {
        const n = Number.parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const left = parse(a);
  const right = parse(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }
  return 0;
}

export function getInstalledAppVersion(): string {
  return (
    Constants.expoConfig?.version?.trim() ||
    Constants.nativeAppVersion?.trim() ||
    "0.0.0"
  );
}

export function resolveStoreUrl(config: AppUpdateConfig): string {
  if (Platform.OS === "ios") {
    return config.iosStoreUrl?.trim() || appStoreUrl() || "";
  }
  if (Platform.OS === "android") {
    return config.androidStoreUrl?.trim() || playStoreUrl() || "";
  }
  return config.androidStoreUrl?.trim() || config.iosStoreUrl?.trim() || playStoreUrl() || "";
}

async function wasSoftUpdateDismissed(latestVersion: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(`${DISMISS_KEY_PREFIX}${latestVersion}`);
    return value === "1";
  } catch {
    return false;
  }
}

export async function dismissSoftUpdate(latestVersion: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${latestVersion}`, "1");
  } catch {
    // ignore storage failures
  }
}

export async function fetchAppUpdateConfig(): Promise<AppUpdateConfig | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("app_update_config")
    .select(
      "latest_version,min_supported_version,title,message,ios_store_url,android_store_url",
    )
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ConfigRow;
  return {
    latestVersion: row.latest_version.trim(),
    minSupportedVersion: row.min_supported_version.trim(),
    title: row.title?.trim() || null,
    message: row.message?.trim() || null,
    iosStoreUrl: row.ios_store_url?.trim() || null,
    androidStoreUrl: row.android_store_url?.trim() || null,
  };
}

export async function evaluateAppUpdatePrompt(): Promise<AppUpdatePrompt | null> {
  if (Platform.OS === "web") return null;

  const config = await fetchAppUpdateConfig();
  if (!config?.latestVersion || !config.minSupportedVersion) return null;

  const installedVersion = getInstalledAppVersion();
  const storeUrl = resolveStoreUrl(config);
  if (!storeUrl) return null;

  if (compareVersions(installedVersion, config.minSupportedVersion) < 0) {
    return { kind: "force", config, installedVersion, storeUrl };
  }

  if (compareVersions(installedVersion, config.latestVersion) < 0) {
    if (await wasSoftUpdateDismissed(config.latestVersion)) return null;
    return { kind: "soft", config, installedVersion, storeUrl };
  }

  return null;
}

export async function openAppStore(url: string): Promise<void> {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    // ignore open failures
  }
}
