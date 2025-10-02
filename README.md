# Mesh Editor PWA

Mesh Editor is a mobile-first Progressive Web App built on Babylon.js that delivers 3D modeling, UV editing, and texture painting directly in the browser. The application installs like a native app, runs fully offline after the first load, and stores projects locally using the Origin Private File System (OPFS).

## Features

- **Babylon.js runtime** with automatic WebGPU preference and WebGL2 fallback.
- **Modeling tools**: box/sphere/cylinder/plane primitives, face extrusion, inset, bevel, loop cut, mirror, Catmull–Clark subdivision, decimation, merge/weld, undo/redo with a binary history journal, and non-destructive modifier stack.
- **UV mode**: automatic unwrap, seam marking, island packing, and UV layout export as PNG.
- **Texture painting**: on-mesh painting to a 2K canvas with configurable brushes, eyedropper, fill, and editable layer base. Saves PNG edits and generates KTX2 runtime textures.
- **GLB I/O**: import GLB/GLTF (Draco + meshopt) and export GLB snapshots alongside runtime textures.
- **Project storage**: OPFS-backed autosave every 60s, manual saves, thumbnails, and local project browser.
- **PWA shell**: installable, offline-capable, Add-to-Home-Screen ready with service worker precache and manifest.
- **Status HUD**: backend (WebGPU/WebGL2), FPS, draw calls, and local storage usage.
- **Touch-first UI**: bottom toolbar, outliner, properties tabs, long-press context ring, and onboarding overlay for gestures/modes.

## Directory Layout

```
app/            # PWA bootstrap, runtime composition, global state
engine/         # Babylon runtime + modeling, UV, paint subsystems
io/             # GLB import/export helpers, KTX2 encoder
storage/        # OPFS adapters, autosave routines
ui/             # Touch UI components, overlays, panels
public/         # index.html, manifest, service worker, PWA entry (app.js)
scripts/        # Dev/build/preview servers (HTTPS static)
package.json    # npm scripts and dependency declarations
```

## Development

1. Install dependencies (requires Node 18+). The project uses scoped Babylon.js packages and may require access to the public npm registry.

   ```bash
   npm install
   ```

2. Start the HTTPS dev server with live rebuild:

   ```bash
   npm run dev
   ```

   The script serves `public/` over HTTPS (self-signed certificate) and watches sources to rebuild `public/app.js`. Accept the certificate the first time you connect.

3. Production build:

   ```bash
   npm run build
   ```

   The build script bundles `app/main.js` and dependencies into `public/app.js`, bumps the service worker cache key, and prepares static assets.

4. Preview the static build:

   ```bash
   npm run preview
   ```

   Launches an HTTPS static server reading directly from `public/`.

### Offline & PWA Testing

- **Local testing**: `npm run dev` or `npm run preview`, then open `https://localhost:5173`. Service worker registration is restricted to secure contexts.
- **Install prompt**: Chrome will offer Add to Home Screen when visiting over HTTPS. iOS requires Safari → Share → Add to Home Screen.
- **Offline mode**: After the first successful load, enable airplane mode and reload; the service worker precache (including module graph) keeps the app functional.

## Project Storage & Autosave

- Autosaves every 60 seconds to OPFS under `projects/<uuid>/`.
- Stored artifacts:
  - `mesh.glb` – exported GLB snapshot.
  - `state.json` – serialized project manifest (future extension).
  - `textures/baseColor.png` – editable texture.
  - `textures/baseColor.ktx2` – runtime texture encoded as uncompressed KTX2.
- Use the **Projects** button to create, open, or delete local projects. OPFS must be supported by the browser (Chrome/Edge/Opera ≥ 102, Safari ≥ 17).

## Modeling Workflow Highlights

1. **Create primitives** via the Add menu (long-press for context ring actions).
2. **Edit mode**: tap to select faces, long-press for Extrude/Inset/Bevel/Loop Cut/Mirror/Subdivide/Decimate. Undo/redo buttons appear in the toolbar when history is available.
3. **UV mode**: auto unwrap, mark seams with long-press, pack islands, and export UV PNG from Properties → UV.
4. **Paint mode**: choose brush, tap to paint on the mesh, use eyedropper via long press, and save PNG textures (Properties → Texture).
5. **Export**: bottom toolbar → Export to download GLB with embedded textures. Autosave generates runtime KTX2 alongside PNG edits.

## Deployment

- Deploy the entire repository (or the `public/` directory after `npm run build`) to any static host supporting HTTPS (e.g., GitHub Pages, Netlify, Vercel).
- Service worker scope is `./`, so hosting under `https://<user>.github.io/<repo>/` works without additional configuration.

## Testing Status

Automated test suites are not included. Manual verification steps:

- `npm run dev` – launches HTTPS dev server.
- `npm run build` – produces production bundle.
- `npm run preview` – serves built assets.

> **Note:** Access to the npm registry is required for Babylon.js dependencies. In environments without external network access, the install and build scripts cannot resolve packages.

## Known Limitations

- The embedded KTX2 encoder writes uncompressed textures; integrate a production-ready encoder when available and add regression tests to validate the exported files.
- Redo currently restores mesh topology but not modifier UI state; align modifier serialization with the history log to keep the inspector in sync after redo.
- Project thumbnails and manifest snapshots are placeholders; flesh out the serialization format before exposing cross-session previews.
- Gesture handling has only been verified in pointer-based simulators; test on physical touch devices to confirm long-press and pinch detection behaviour.
