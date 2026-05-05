/**
 * Reads credentials/firebase-service-account.json and sets Supabase secret
 * FIREBASE_SERVICE_ACCOUNT_JSON via `supabase secrets set --env-file` (safe quoting).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const keyPath = path.join(root, "credentials", "firebase-service-account.json");

if (!fs.existsSync(keyPath)) {
  console.error("Missing file:\n  " + keyPath + "\n");
  console.error(
    "Download: Firebase → Project settings → Service accounts → Generate new private key",
  );
  console.error("Save the JSON as the filename above, then run this script again.\n");
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(keyPath, "utf8").trim();
  JSON.parse(raw);
} catch (e) {
  console.error("Invalid JSON in firebase-service-account.json:", e.message);
  process.exit(1);
}

const tmp = path.join(root, ".env.supabase-push.tmp");
try {
  fs.writeFileSync(tmp, `FIREBASE_SERVICE_ACCOUNT_JSON=${JSON.stringify(raw)}\n`, "utf8");
  const r = spawnSync("npx", ["supabase", "secrets", "set", "--env-file", tmp], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(r.status === 0 ? 0 : r.status ?? 1);
} finally {
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
