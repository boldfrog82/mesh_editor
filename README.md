# Mesh Editor Prototype

This prototype boots a lightweight 3D engine that now supports both a desktop
pygame shell and a mobile-friendly web viewer.

## Desktop experience

Run the default desktop experience (requires `pygame`):

```bash
python main.py
```

## Mobile web viewer

The mobile viewer exposes the engine state over HTTP and renders the default
scene in a responsive Three.js view that works well on Android browsers.

1. Install Flask if it is not already available:
   ```bash
   pip install flask
   ```
2. Connect your development machine and Android phone to the same Wi-Fi
   network. This allows the phone to reach the local server.
3. Start the application in mobile mode. You can optionally control the bind
   address and port directly from the command line:
   ```bash
   python main.py --mobile --host 0.0.0.0 --port 5000
   ```
   The server prints both the bind address and a "shareable" address that you
   can open on another device. If you already know your computer's LAN IP, you
   can pass it with `--host` (for example `--host 192.168.1.10`).
4. On your Android device, open the printed URL in Chrome or Firefox. If the
   page does not load, double-check that the phone is on the same network and
   that the desktop firewall allows incoming connections on the chosen port.
5. Use the on-screen instructions to orbit, pan, or zoom the model.

You can also force mobile mode without the command-line flag by setting an
environment variable:

```bash
export MESH_EDITOR_FORCE_MOBILE=1
python main.py
```

By default the server listens on all interfaces (`0.0.0.0`) and port `5000`.
Override these defaults with the `--host`/`--port` flags or the environment
variables `MESH_EDITOR_MOBILE_HOST` and `MESH_EDITOR_MOBILE_PORT` when needed.

### Smoke-testing the mobile server

After starting the server you can confirm that it is running by fetching the
scene payload from the same machine:

```bash
curl http://127.0.0.1:5000/api/scene
```

The command should print a JSON document describing the meshes and active
camera. If you have trouble reaching the endpoint locally, resolve that issue
before attempting to connect from your phone.

## Notes

- The mobile viewer currently streams a snapshot of meshes that exist when the
  server starts. Use the **Refresh scene** button in the UI to fetch the latest
  data.
- Advanced modeling features remain desktop-only while the mobile workflow
  focuses on reviewing and light navigation of the scene.

## Installable PWA (offline-ready)

The repository also ships an installable Progressive Web App located in
[`pwa/`](pwa/) that runs entirely client-side. You can deploy it as static
files (for example with GitHub Pages or Netlify) and then install it on Android
via **Add to Home Screen**.

codex/build-minimum-viable-pwa
1. Serve the directory locally to test (service workers run on `localhost`):
   ```bash
   cd pwa
   python -m http.server 5173
   ```
   Then open `http://127.0.0.1:5173` in your browser.
2. The app registers a service worker scoped to `/pwa/` that pre-caches the app
   shell plus the Three.js CDN modules it imports. After the first successful
   load, the viewer works completely offline.
3. To deploy, point GitHub Pages (or any static host) at the `pwa/` directory.
   Make sure the site is served over **HTTPS**—Chrome will then surface the
   install prompt once the manifest and service worker are detected.
4. The manifest embeds base64 PNG icons directly, satisfying Android's Add to
   Home Screen requirements while keeping the artwork fully text-based for
   source control friendliness.

**Troubleshooting**

- If the **Install app** button never appears, open DevTools → Application →
  Manifest to confirm each field is valid and that the page is controlled by a
  service worker.
- Offline failures usually indicate that one of the CDN modules was blocked on
  first load. Clear the site data and reload while online to re-populate the
  cache.
- iOS Safari supports the experience but requires tapping the Share icon →
  **Add to Home Screen** manually. File picker access works, but the File
  System Access API is still limited on iOS.

1. Serve the directory locally to test:
   ```bash
   python -m http.server --directory pwa 5173
   ```
   Then open `http://127.0.0.1:5173` in your browser.
2. The app registers a service worker that pre-caches the shell and caches
   Three.js modules on first load, making the viewer available offline after it
   has been opened once.
3. To deploy, copy the contents of `pwa/` to any static host. The installable
   icons are shipped as SVG files so they remain editable without binary assets.
Main
