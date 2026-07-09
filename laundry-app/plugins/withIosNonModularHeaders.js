const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withIosNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (fs.existsSync(filePath)) {
        let contents = fs.readFileSync(filePath, "utf-8");

        const patch = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

        if (!contents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
          contents = contents.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|${patch}`
          );
        }

        // react-native-firebase requires this when using static frameworks, otherwise
        // its Objective-C bridging files (RCT_EXPORT_METHOD macros) fail to compile.
        if (!contents.includes("$RNFirebaseAsStaticFramework")) {
          contents = contents.replace(
            /(prepare_react_native_project!)/,
            `$RNFirebaseAsStaticFramework = true\n\n$1`
          );
        }

        fs.writeFileSync(filePath, contents);
      }
      return config;
    },
  ]);
};
