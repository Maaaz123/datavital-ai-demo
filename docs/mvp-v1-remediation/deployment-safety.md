# MVP V1 — Deployment Safety

**Rule:** NEVER use `rsync --delete` or unscoped `rm -rf` against the repository root.

Prior incident (Domain 14): a failed `rsync --delete` wiped the working tree and required restore from agent transcript.

---

## Safe selective deploy (GitHub Pages from repo root)

Build first:

```bash
cd frontend && npm run build
```

Then copy **only** Vite dist artifacts to the repository root:

```bash
cp -f frontend/dist/index.html index.html
cp -f frontend/dist/index.html 404.html
cp -f frontend/dist/sw.js sw.js
cp frontend/dist/workbox-*.js .
# refresh.html is maintained in-repo (root + frontend/public) with BUILD_ID
rm -rf assets && mkdir assets && cp -R frontend/dist/assets/. assets/
```

### Allowed overwrite paths

- `index.html`, `404.html`, `refresh.html`
- `sw.js`, `workbox-*.js`
- `assets/` (hashed JS/CSS/fonts)
- optionally `manifest.webmanifest`, `favicon.svg` if present in dist

### Forbidden

- `rsync --delete` of repo root or Pages tree
- Unscoped `rm -rf` of source directories (`frontend/`, `docs/`, `.git/`, etc.)
- Force-push
- Replacing the entire repository with build output

---

## Pre / post checks

1. Confirm `index.html` references `/assets/index-*.js` and `/assets/index-*.css` hashes that exist under `assets/`.
2. Confirm `refresh.html` `BUILD_ID` matches `frontend/src/pwa.ts`.
3. Confirm source directories still present (`frontend/src`, `docs/`).
4. After push to `main` (Pages): verify `https://demo.datavital.io/refresh.html` shows the new BUILD_ID.

---

## BUILD_ID for this remediation

Target: `v80-mvp-v1-remediation` in:

- `frontend/src/pwa.ts`
- `refresh.html` (repo root)
- `frontend/public/refresh.html`
