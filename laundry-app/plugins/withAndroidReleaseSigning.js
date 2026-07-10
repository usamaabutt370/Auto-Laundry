const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Wires the real Play Store signing keystore into every prebuild, since android/
 * is regenerated from scratch each time and would otherwise fall back to the
 * debug keystore for release builds.
 */
module.exports = function withAndroidReleaseSigning(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const keystoreSrc = path.join(
        config.modRequest.projectRoot,
        "credentials/android/keystore.jks"
      );
      const keystoreDest = path.join(
        config.modRequest.platformProjectRoot,
        "app/release.keystore"
      );
      if (fs.existsSync(keystoreSrc)) {
        fs.copyFileSync(keystoreSrc, keystoreDest);
      }

      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "app/build.gradle"
      );
      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, "utf-8");

        if (!contents.includes("release.keystore")) {
          const debugSigningConfig = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;
          const withReleaseSigningConfig = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }`;

          if (!contents.includes(debugSigningConfig)) {
            throw new Error(
              "withAndroidReleaseSigning: android/app/build.gradle's signingConfigs block " +
                "didn't match the expected template — update this plugin's string match."
            );
          }

          contents = contents.replace(debugSigningConfig, withReleaseSigningConfig);
          contents = contents.replace(
            "signingConfig signingConfigs.debug\n            def enableShrinkResources",
            "signingConfig signingConfigs.release\n            def enableShrinkResources"
          );

          fs.writeFileSync(buildGradlePath, contents);
        }
      }
      return config;
    },
  ]);
};
