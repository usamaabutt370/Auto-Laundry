// heic2any runs `window.__heic2any__worker = new Worker(...)` at module level.
// That crashes Expo's Node.js static-rendering pass.
// Metro always resolves `heic2any` to this file; at runtime we decide which
// implementation to use so the browser still gets the real conversion logic.
if (typeof window === "undefined") {
  // Node.js / SSR — skip the real package entirely
  var noop = function () { return Promise.resolve(null); };
  module.exports = noop;
  module.exports["default"] = noop;
} else {
  // Browser — delegate to the real implementation
  module.exports = require("../node_modules/heic2any/dist/heic2any.js");
}
