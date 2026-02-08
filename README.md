# Clase1-2026 Extension — Vite + TypeScript

This repository is a Chrome extension scaffold converted to use Vite and TypeScript.

Quick commands

- Install dev dependencies:

```bash
npm install
```

- Run Vite dev server (useful to preview popup as a webpage):

```bash
npm run dev
```

- Build production extension into `dist/`:

```bash
npm run build
```

After `npm run build` the `dist/` folder will contain the extension files including `manifest.json`. To load it in Chrome/Edge for testing:

1. Open `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked" and choose the project's `dist/` folder.

Notes

- The repository contains a small `public/tailwind.css` used as a minimal set of utilities so the popup looks good without loading remote scripts (CSP). If you want full Tailwind, follow the Tailwind CLI steps and overwrite `public/tailwind.css` with the generated file.

- `vite.config.ts` builds three entries: `popup` (HTML), `background` (service worker) and `content` (content script).

- The build step runs `scripts/copy-manifest.js` to generate a `dist/manifest.json` that references the built files.
