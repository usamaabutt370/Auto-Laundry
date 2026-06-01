/**
 * Ensures React headers load before Firebase / RNFBApp in @react-native-firebase/messaging
 * iOS sources. RNFBApp uses DEFINES_MODULE with static frameworks; importing RNFBApp before
 * React binds RCT* types to the RNFBApp Clang module and breaks compilation (see invertase/react-native-firebase#8988).
 */
const fs = require("fs");
const path = require("path");

const messagingDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-firebase",
  "messaging",
  "ios",
  "RNFBMessaging"
);

function patchFile(rel, replacements) {
  const fp = path.join(messagingDir, rel);
  if (!fs.existsSync(fp)) return;
  let s = fs.readFileSync(fp, "utf8");
  let changed = false;
  for (const { from, to } of replacements) {
    if (s.includes(from)) {
      s = s.split(from).join(to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(fp, s);
}

if (!fs.existsSync(messagingDir)) {
  process.exit(0);
}

patchFile("RNFBMessagingModule.m", [
  {
    from: `#import <Firebase/Firebase.h>
#import <RNFBApp/RNFBSharedUtils.h>
#import <React/RCTConvert.h>
#import <React/RCTUtils.h>`,
    to: `#import <React/RCTBridgeModule.h>
#import <React/RCTConvert.h>
#import <React/RCTUtils.h>
#import <Firebase/Firebase.h>
#import <RNFBApp/RNFBSharedUtils.h>`,
  },
]);

patchFile("RNFBMessaging+NSNotificationCenter.m", [
  {
    from: `#import <Firebase/Firebase.h>
#import <RNFBApp/RNFBJSON.h>
#import <RNFBApp/RNFBRCTEventEmitter.h>
#import <React/RCTConvert.h>
#import <React/RCTRootView.h>`,
    to: `#import <React/RCTDefines.h>
#import <React/RCTConvert.h>
#import <React/RCTRootView.h>
#import <Firebase/Firebase.h>
#import <RNFBApp/RNFBJSON.h>
#import <RNFBApp/RNFBRCTEventEmitter.h>`,
  },
]);

patchFile("RNFBMessaging+AppDelegate.m", [
  {
    from: `#import <Firebase/Firebase.h>
#import <GoogleUtilities/GULAppDelegateSwizzler.h>
#import <objc/runtime.h>

#import <RNFBApp/RNFBRCTEventEmitter.h>
#import <RNFBApp/RNFBSharedUtils.h>
#import <React/RCTConvert.h>`,
    to: `#import <React/RCTBridgeModule.h>
#import <React/RCTConvert.h>
#import <Firebase/Firebase.h>
#import <GoogleUtilities/GULAppDelegateSwizzler.h>
#import <objc/runtime.h>

#import <RNFBApp/RNFBRCTEventEmitter.h>
#import <RNFBApp/RNFBSharedUtils.h>`,
  },
]);

patchFile("RNFBMessaging+FIRMessagingDelegate.m", [
  {
    from: `#import <GoogleUtilities/GULAppDelegateSwizzler.h>
#import <RNFBApp/RNFBRCTEventEmitter.h>`,
    to: `#import <React/RCTEventEmitter.h>
#import <GoogleUtilities/GULAppDelegateSwizzler.h>
#import <RNFBApp/RNFBRCTEventEmitter.h>`,
  },
]);

patchFile("RNFBMessaging+UNUserNotificationCenter.m", [
  {
    from: `#import <RNFBApp/RNFBRCTEventEmitter.h>

#import "RNFBJSON.h"`,
    to: `#import <React/RCTEventEmitter.h>
#import <RNFBApp/RNFBRCTEventEmitter.h>

#import "RNFBJSON.h"`,
  },
]);
