const fs = require("fs");
const path = require("path");
const appJson = require("./app.json");
const withIosNonModularHeaders = require("./plugins/withIosNonModularHeaders");
const withAndroidReleaseSigning = require("./plugins/withAndroidReleaseSigning");

require("dotenv").config();

const root = path.dirname(require.resolve("./app.json"));
const androidGs = path.join(root, "google-services.json");
const iosGs = path.join(root, "GoogleService-Info.plist");

const firebasePlugins = [
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
  ["expo-build-properties", { ios: { useFrameworks: "static", buildReactNativeFromSource: true } }],
  "expo-notifications",
  [
    "expo-image-picker",
    {
      photosPermission: "Allow access to your photos to share images in chat.",
      cameraPermission: "Allow the app to use the camera to share photos in chat.",
      microphonePermission: false,
    },
  ],
  [
    "expo-location",
    {
      locationWhenInUsePermission:
        "Allow location access to show nearby launderers and accurate distance.",
      locationAlwaysAndWhenInUsePermission: false,
      locationAlwaysPermission: false,
    },
  ],
  withIosNonModularHeaders,
  withAndroidReleaseSigning,
];

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    owner: "usamaabutt371",
    plugins: [...(appJson.expo.plugins || []), ...firebasePlugins],
    android: {
      ...appJson.expo.android,
      ...(fs.existsSync(androidGs) ? { googleServicesFile: "./google-services.json" } : {}),
    },
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...appJson.expo.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
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
        projectId: "3822a2ec-4323-4393-89ac-59a78c554ed8",
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },
};
