const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * react-async-hook (dependency of react-native-country-picker-modal) ships a broken
 * `module` field pointing outside /dist. Native uses the country picker; web uses
 * country-code-picker.web.tsx, but keep this alias for safety.
 */
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-async-hook") {
    return {
      type: "sourceFile",
      filePath: path.resolve(
        __dirname,
        "node_modules/react-async-hook/dist/react-async-hook.esm.js",
      ),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
