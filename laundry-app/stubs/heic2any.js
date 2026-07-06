// Safe no-op stub used during Expo web static rendering (Node.js environment).
// The real heic2any package accesses `window` at module level and crashes in Node.js.
// Metro's resolver swaps this stub in when building the SSR bundle.
// The real package is used for the browser bundle.
var stub = function () { return Promise.resolve(null); };
module.exports = stub;
module.exports["default"] = stub;
