export function initFirstRunOverlay() {
  const element = document.createElement('div');
  element.className = 'first-run-overlay';
  element.innerHTML = `
    <h2>Welcome to Mesh Editor Mobile</h2>
    <p>Use one hand to orbit (drag), two fingers to pan/zoom. Switch between Edit, UV, and Paint modes using the toolbar. Long press on the viewport to open the context menu for mesh operations.</p>
    <ul style="text-align:left;max-width:420px;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:0.85rem;">
      <li><strong>Edit mode:</strong> select elements, extrude, bevel, loop cut, mirror, subdivide, decimate.</li>
      <li><strong>UV mode:</strong> mark seams in 3D, preview and pack islands, export UV layout PNG.</li>
      <li><strong>Paint mode:</strong> paint directly onto base color textures, eyedrop, fill, export PNG/KTX2.</li>
    </ul>
    <button id="firstRunDismiss">Let me build</button>
  `;

  const dismissBtn = element.querySelector('#firstRunDismiss');
  let runtime = null;
  let onDismissCb = null;

  dismissBtn.addEventListener('click', () => {
    element.hidden = true;
    if (onDismissCb) onDismissCb();
  });

  return {
    element,
    bindRuntime(nextRuntime) {
      runtime = nextRuntime;
    },
    onDismiss(cb) {
      onDismissCb = cb;
    },
    show() {
      element.hidden = false;
    },
    hide() {
      element.hidden = true;
    },
    toggle(show) {
      element.hidden = !show;
    }
  };
}
