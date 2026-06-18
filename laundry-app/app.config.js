const fs = require("fs");
const path = require("path");
const appJson = require("./app.json");
const withIosNonModularHeaders = require("./plugins/withIosNonModularHeaders");

require("dotenv").config();

const root = path.dirname(require.resolve("./app.json"));
const androidGs = path.join(root, "google-services.json");
const iosGs = path.join(root, "GoogleService-Info.plist");

const firebasePlugins = [
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  ["expo-build-properties", { ios: { useFrameworks: "static" } }],
  "expo-notifications",
  [
    "expo-image-picker",
    {
      photosPermission: "Allow access to your photos to share images in chat.",
      cameraPermission: "Allow the app to use the camera to share photos in chat.",
    },
  ],
  [
    "expo-location",
    {
      locationWhenInUsePermission:
        "Allow location access to show nearby launderers and accurate distance.",
    },
  ],
  withIosNonModularHeaders,
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
      eas: {
        ...(typeof appJson.expo.extra?.eas === "object" && appJson.expo.extra.eas !== null
          ? appJson.expo.extra.eas
          : {}),
        projectId: "4a51a6dc-ed9a-49ea-b679-d6bf0e149a16",
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
};
