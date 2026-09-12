# DailyDrobe

Personal wardrobe management and outfit-rotation system. Local-first — all data lives in
the browser's IndexedDB. No backend, no accounts, no API keys, no environment variables.

## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally to sanity-check it
```

## Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, "Import Project" from that repo.
3. Vercel auto-detects the Vite framework preset. `vercel.json` in this repo already pins:
   - Build command: `npm run build`
   - Output directory: `dist`
   - A catch-all rewrite to `index.html` (safe for a single-page app; also future-proofs
     the deploy if client-side routes are ever added)
4. No environment variables are required. Deploy.

## Data & persistence

- All wardrobe/rotation/wear data is stored in IndexedDB via `idb-keyval` (`src/lib/storage.js`).
- Data persists across refreshes and reopening the app, per-browser/per-device.
- Nothing syncs between devices — use **Settings → Backup → Export backup** to download a
  JSON snapshot, and **Import backup** on another device/browser to restore it.

## PWA / offline

- Installable via "Add to Home Screen" on mobile (manifest + icons in `public/`).
- Runs `display: standalone` — opens without browser chrome where the OS supports it.
- A service worker (via `vite-plugin-pwa`, generated at build time into `dist/sw.js`)
  precaches the built app shell so the app loads offline after the first visit.
- To regenerate icons: `npm i -D sharp && node gen-icons.mjs` (optional; the icons are
  already committed under `public/icons/`).

## What's unchanged

The Excel import, wardrobe/looks/rotation data model, rotation-sequencing rules,
no-office carry-forward, wear-history rules, and all screens (Today, Wardrobe, Looks,
Rotation, Insights, Settings) are the same application logic as before — only the
persistence layer (window.storage → IndexedDB) and the project scaffolding are new.
