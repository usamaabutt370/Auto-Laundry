const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../public/launderer-link.html");
const dist = path.join(__dirname, "../dist");

fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(src, path.join(dist, "launderer-link.html"));

const client = path.join(dist, "client");
if (fs.existsSync(client)) {
  fs.copyFileSync(src, path.join(client, "launderer-link.html"));
}
