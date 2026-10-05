const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "../public");
const dist = path.join(__dirname, "../dist");
const wellKnownSrc = path.join(publicDir, ".well-known");

function copyInto(targetRoot) {
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.copyFileSync(
    path.join(publicDir, "launderer-link.html"),
    path.join(targetRoot, "launderer-link.html"),
  );

  if (!fs.existsSync(wellKnownSrc)) return;
  const wellKnownDest = path.join(targetRoot, ".well-known");
  fs.mkdirSync(wellKnownDest, { recursive: true });
  for (const name of fs.readdirSync(wellKnownSrc)) {
    fs.copyFileSync(path.join(wellKnownSrc, name), path.join(wellKnownDest, name));
  }
}

copyInto(dist);

const client = path.join(dist, "client");
if (fs.existsSync(client)) {
  copyInto(client);
}
