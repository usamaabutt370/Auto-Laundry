const fs = require("fs");
const path = require("path");
const appJson = require("./app.json");

require("dotenv").config();

const root = __dirname;
const androidGs = path.join(root, "google-services.json");
const iosGs = path.join(root, "GoogleService-Info.plist");

const firebasePlugins = [
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  ["expo-build-properties", { ios: { useFrameworks: "static" } }],
  "expo-notifications",
];

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins || []), ...firebasePlugins],
    android: {
      ...appJson.expo.android,
      ...(fs.existsSync(androidGs) ? { googleServicesFile: "./google-services.json" } : {}),
    },
    ios: {
      ...appJson.expo.ios,
      ...(fs.existsSync(iosGs) ? { googleServicesFile: "./GoogleService-Info.plist" } : {}),
    },
    extra: {
      ...(typeof appJson.expo.extra === "object" && appJson.expo.extra !== null
        ? appJson.expo.extra
        : {}),
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
};
