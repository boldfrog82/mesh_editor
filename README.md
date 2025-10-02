# Mesh Editor Mobile PWA

This repository contains an installable Progressive Web App that boots a
Babylon.js scene with mobile-first controls, persistent storage via OPFS, and a
project-centric workflow. The current build focuses on the core shell and data
flow so you can iterate quickly on modeling, UV, and painting features while the
app remains deployable as static files.

## Repository layout

```
app/        # PWA bootstrap, runtime composition, global state
engine/     # Scene runtime (Babylon.js), modeling/UV/paint subsystems
ui/         # Mobile UI: viewport chrome, panels, overlays, toolbar
io/         # GLB import/export hooks and texture encoders
storage/    # Origin Private File System adapters & autosave helpers
public/     # Web app manifest, service worker, installable entry point
vendor/     # Place self-hosted third-party libs if you choose to bundle later
```

## Local development

Service workers require HTTPS or `localhost`, so use a tiny static server while
iterating:

```bash
python -m http.server --directory public 4173
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173). The landing page loads
`app/main.js`, spins up Babylon.js (WebGPU when available, else WebGL2), and
initialises the UI shell. The runtime announces the active backend in the status
panel and the Add-to-Home-Screen banner appears after the first successful load.

## Deployment

1. Commit the repository to GitHub and enable **Pages → Deploy from branch →
   `main` → `/public`**.
2. Visit the published URL over HTTPS. Chrome will surface an install prompt
   once the manifest and service worker are detected. Safari users can add the
   app via the Share sheet.
3. After the first online visit, all JavaScript modules and Babylon.js CDN
   assets are cached offline by `public/sw.js`.

## Features snapshot

- Mobile-first Babylon.js viewport with touch gestures (ArcRotateCamera).
- Status HUD reporting backend (WebGPU/WebGL2), FPS, draw calls, storage usage.
- Project picker backed by OPFS (falls back to in-memory store when unsupported).
- Autosave scaffolding (OPFS metadata writing hooks) ready for scene + texture
  persistence.
- Toolbar with mode switches for Object, Edit, UV, Paint, Materials, Export.
- First-run overlay detailing gestures and the three primary workflows.
- Skeleton modeling/UV/paint engines ready for incremental tool integration.

> **Note:** Geometry editing, UV unwrapping, texture painting, and modifier
> stacks are represented by stubs that currently surface toasts. The runtime is
> wired so you can implement each operation inside `engine/` without touching
> the UI shell or storage layer.

## Extending the toolset

- Flesh out `engine/mesh.js` to support face/edge/vertex selections and
  operations such as Extrude, Inset, Bevel, Loop Cut, Weld, Mirror, Subdivide,
  and Decimate.
- Build the UV workflow in `engine/uv.js` to mark seams in 3D, preview islands
  in 2D, and export packed layouts to `/textures/uv_*.png` via OPFS.
- Implement painting in `engine/paint.js` using render targets, brush dynamics,
  and `io/ktx2.js` for PNG → KTX2 conversion (web workers recommended).
- Use `storage/opfs.js` to persist project state, autosaves, textures, and
  thumbnails. Hook `setInterval` autosaves (every 60 s) once your serialization
  format is stable.
- Bundle Babylon.js locally (drop files into `vendor/` and update
  `window.__MESH_EDITOR_CONFIG__`) if you need full offline bootstrap without a
  CDN warm-up.

## Testing checklist

- [ ] Create a project, add primitives, switch tools, and confirm selections.
- [ ] Install the PWA on Android/iOS and verify offline startup.
- [ ] Inspect DevTools → Application → Storage to see OPFS usage updates.
- [ ] Hook up Babylon's GLB exporter in `io/glb.js` and validate round-trips.

Contributions are welcome—fork the repo, extend the engine modules, and open a
pull request describing the modeling, UV, or painting features you added.
