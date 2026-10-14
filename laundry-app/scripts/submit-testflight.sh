#!/usr/bin/env bash
# Upload a store-signed iOS build to TestFlight with EAS Submit.
#
# A TestFlight upload is not an App Store release. Apple processes the binary
# (usually 10–15 minutes) and then it is available for internal testing.
# Promoting it to the App Store is a separate step in App Store Connect.
#
# Docs:
#   https://docs.expo.dev/submit/ios/
#   https://docs.expo.dev/submit/testflight
#   https://docs.expo.dev/build/automate-submissions
#   https://docs.expo.dev/submit/eas-json
#
# Usage (from laundry-app/):
#   ./scripts/submit-testflight.sh
#       Submit the latest finished EAS iOS build.
#   ./scripts/submit-testflight.sh --build
#       Create a production store build, then submit it.
#   ./scripts/submit-testflight.sh --id <eas-build-id>
#       Submit one EAS build by id.
#   ./scripts/submit-testflight.sh --path <file.ipa>
#       Submit a local .ipa.
#
# Optional environment:
#   TESTFLIGHT_GROUPS   Comma-separated internal TestFlight group names.
#                       External groups are not accepted by --groups.
#   WHAT_TO_TEST        TestFlight "What to Test" notes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="submit"
BUILD_ID=""
IPA_PATH=""

usage() {
  cat <<'EOF'
Upload a store-signed iOS build to TestFlight with EAS Submit.

Usage:
  ./scripts/submit-testflight.sh
  ./scripts/submit-testflight.sh --build
  ./scripts/submit-testflight.sh --id <eas-build-id>
  ./scripts/submit-testflight.sh --path <file.ipa>

Optional environment:
  TESTFLIGHT_GROUPS   Comma-separated internal TestFlight group names
  WHAT_TO_TEST        TestFlight "What to Test" notes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      MODE="build"
      shift
      ;;
    --id)
      BUILD_ID="${2:-}"
      if [[ -z "$BUILD_ID" ]]; then
        echo "Missing value for --id" >&2
        exit 1
      fi
      shift 2
      ;;
    --path)
      IPA_PATH="${2:-}"
      if [[ -z "$IPA_PATH" ]]; then
        echo "Missing value for --path" >&2
        exit 1
      fi
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "$BUILD_ID" && -n "$IPA_PATH" ]]; then
  echo "Use only one of --id or --path." >&2
  exit 1
fi

if [[ "$MODE" == "build" && (-n "$BUILD_ID" || -n "$IPA_PATH") ]]; then
  echo "--build starts a new production build. Do not combine it with --id or --path." >&2
  exit 1
fi

node <<'NODE'
const eas = require("./eas.json");
const submit = eas.submit?.production?.ios;
const build = eas.build?.production ?? {};
const distribution = build.ios?.distribution || build.distribution || "store";

if (distribution !== "store") {
  console.error(
    `TestFlight only accepts distribution "store". production iOS is "${distribution}".`,
  );
  console.error("https://docs.expo.dev/submit/testflight");
  process.exit(1);
}

if (!submit?.ascAppId) {
  console.error("submit.production.ios.ascAppId is required for a non-interactive TestFlight upload.");
  console.error("https://docs.expo.dev/submit/ios/");
  process.exit(1);
}

// Prefer the App Store Connect API key already assigned on EAS for this app.
// Local ascApiKeyPath / Id / IssuerId override that and are optional.
// https://docs.expo.dev/submit/ios/
if (submit.ascApiKeyPath || submit.ascApiKeyId || submit.ascApiKeyIssuerId) {
  const fs = require("fs");
  const path = require("path");
  const required = ["ascApiKeyPath", "ascApiKeyId", "ascApiKeyIssuerId"];
  const missing = required.filter((key) => !submit[key]);
  if (missing.length) {
    console.error("Local ASC key fields are partial. Missing: " + missing.join(", "));
    console.error("Either remove all three and use the EAS-managed key, or set all three.");
    process.exit(1);
  }
  const expanded = String(submit.ascApiKeyPath).replace(
    /\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_, name) => process.env[name] ?? "",
  );
  const keyPath = path.isAbsolute(expanded) ? expanded : path.resolve(expanded);
  if (!fs.existsSync(keyPath)) {
    console.error("Local App Store Connect API key (.p8) was not found:");
    console.error("  " + keyPath);
    process.exit(1);
  }
  console.log("Using local App Store Connect API key from eas.json.");
} else {
  console.log("Using the App Store Connect API key assigned to this app on EAS.");
}
NODE

EXTRA=()
if [[ -n "${TESTFLIGHT_GROUPS:-}" ]]; then
  IFS=',' read -ra GROUPS <<< "$TESTFLIGHT_GROUPS"
  for group in "${GROUPS[@]}"; do
    group="${group#"${group%%[![:space:]]*}"}"
    group="${group%"${group##*[![:space:]]}"}"
    if [[ -n "$group" ]]; then
      EXTRA+=(--groups "$group")
    fi
  done
fi
if [[ -n "${WHAT_TO_TEST:-}" ]]; then
  EXTRA+=(--what-to-test "$WHAT_TO_TEST")
fi

EAS=(npx --yes eas-cli@latest)

if [[ "$MODE" == "build" ]]; then
  echo "Creating a production iOS store build, then submitting it to TestFlight."
  if [[ ${#EXTRA[@]} -gt 0 ]]; then
    "${EAS[@]}" build --platform ios --profile production --non-interactive
    exec "${EAS[@]}" submit --platform ios --profile production --latest --non-interactive "${EXTRA[@]}"
  fi
  exec "${EAS[@]}" build --platform ios --profile production --auto-submit --non-interactive
fi

SUBMIT=("${EAS[@]}" submit --platform ios --profile production --non-interactive)
if [[ -n "$BUILD_ID" ]]; then
  echo "Submitting EAS build ${BUILD_ID} to TestFlight."
  SUBMIT+=(--id "$BUILD_ID")
elif [[ -n "$IPA_PATH" ]]; then
  echo "Submitting ${IPA_PATH} to TestFlight."
  SUBMIT+=(--path "$IPA_PATH")
else
  echo "Submitting the latest finished iOS build to TestFlight."
  SUBMIT+=(--latest)
fi

exec "${SUBMIT[@]}" "${EXTRA[@]}"
