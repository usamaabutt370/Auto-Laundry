/**
 * Point app_update_config.latest_version at the version in app.json.
 * The installed app compares itself with that row. TestFlight and the public
 * store listings do not update the row on their own.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment or laundry-app/.env.
 * The service role is server-only and must not be shipped in the app.
 */
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const IOS_STORE_URL = "https://apps.apple.com/app/id6789571411";
const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.autolaundry.app";

function compareVersions(a, b) {
  const parse = (value) =>
    String(value)
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

function readVersion() {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8"));
  const version = String(app?.expo?.version ?? "").trim();
  if (!/^[0-9]+(\.[0-9]+){0,3}$/.test(version)) {
    throw new Error(`app.json version "${version}" is not a plain version like 1.1.0`);
  }
  return version;
}

async function rest(url, key, resource, options = {}) {
  const response = await fetch(`${url}/rest/v1/${resource}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Supabase request failed (${response.status})`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const version = readVersion();
  const url = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const iosStoreUrl =
    String(process.env.EXPO_PUBLIC_APP_STORE_URL ?? "").trim() || IOS_STORE_URL;
  const androidStoreUrl =
    String(process.env.EXPO_PUBLIC_PLAY_STORE_URL ?? "").trim() ||
    String(process.env.EXPO_PUBLIC_GOOGLE_PLAY_URL ?? "").trim() ||
    ANDROID_STORE_URL;

  if (!url || !key) {
    console.error(
      "Set SUPABASE_SERVICE_ROLE_KEY in laundry-app/.env (Supabase → Project Settings → API).",
    );
    console.error(
      `Until app_update_config.latest_version is ${version}, installed apps will not show the update sheet.`,
    );
    process.exit(1);
  }

  const rows = await rest(
    url,
    key,
    "app_update_config?select=id,latest_version,ios_store_url,android_store_url&enabled=eq.true&order=updated_at.desc&limit=1",
  );
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    await rest(url, key, "app_update_config", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        latest_version: version,
        min_supported_version: "1.0.0",
        ios_store_url: iosStoreUrl,
        android_store_url: androidStoreUrl,
        enabled: true,
      }),
    });
    console.log(`Published app update ${version}.`);
    return;
  }

  const patch = {};
  if (compareVersions(version, row.latest_version) >= 0) {
    patch.latest_version = version;
  } else {
    console.log(
      `Supabase already has ${row.latest_version}, which is newer than ${version}. Left the version in place.`,
    );
  }
  if (!row.ios_store_url) patch.ios_store_url = iosStoreUrl;
  if (!row.android_store_url) patch.android_store_url = androidStoreUrl;

  if (Object.keys(patch).length === 0) {
    console.log(`App update ${row.latest_version} is already published.`);
    return;
  }

  await rest(url, key, `app_update_config?id=eq.${row.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  console.log(`Published app update ${patch.latest_version || row.latest_version}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
