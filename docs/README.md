# GitHub Pages — Laundri legal site

Static HTML for **Privacy Policy** and **Terms of Service** lives in `docs/legal/`.

## URLs after deployment

If your GitHub username is `YOUR_USER` and the repository is `Auto-Laundry`, GitHub Pages (source: **Deploy from a branch** → **main** → **`/docs`**) will serve:

| Page | URL pattern |
|------|-------------|
| Legal home | `https://YOUR_USER.github.io/Auto-Laundry/legal/` |
| **Privacy (use in Play Console)** | `https://YOUR_USER.github.io/Auto-Laundry/legal/privacy.html` |
| Terms | `https://YOUR_USER.github.io/Auto-Laundry/legal/terms.html` |

Repository name and owner must match your actual GitHub repo.

## Enable GitHub Pages

1. Push these files to GitHub on the default branch (e.g. `main`).
2. Repo **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Branch: **main** (or your default), folder: **`/docs`**.
5. Save. The site may take one to two minutes to appear.

`docs/index.html` redirects visitors to `docs/legal/`.

## Before store submission

Edit `privacy.html`, `terms.html`, and footers to replace `[INSERT …]` placeholders (entity name, address, email, dates, governing law, liability cap). Prefer counsel review before going live.
