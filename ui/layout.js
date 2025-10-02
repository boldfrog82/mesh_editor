import { setTool, setMode, setPrimerVisible } from '../app/state.js';

const TOOLBAR_BUTTONS = [
  { id: 'select', label: 'Select', mode: 'object' },
  { id: 'move', label: 'Move', mode: 'object' },
  { id: 'rotate', label: 'Rotate', mode: 'object' },
  { id: 'scale', label: 'Scale', mode: 'object' },
  { id: 'add', label: 'Add', mode: 'object' },
  { id: 'edit', label: 'Edit', mode: 'edit' },
  { id: 'uv', label: 'UV', mode: 'uv' },
  { id: 'paint', label: 'Paint', mode: 'paint' },
  { id: 'materials', label: 'Materials', mode: 'materials' },
  { id: 'export', label: 'Export', mode: 'object' }
];

export function createLayout(root, actions) {
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'app-header';
  const title = document.createElement('h1');
  title.textContent = 'Mesh Editor';
  const backendTag = document.createElement('span');
  backendTag.className = 'backend-tag';
  backendTag.textContent = 'initialising…';

  const pickerButton = document.createElement('button');
  pickerButton.textContent = 'Projects';
  pickerButton.addEventListener('click', () => actions.openProjectPicker());

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.glb,.gltf,model/gltf-binary';
  fileInput.hidden = true;

  const importButton = document.createElement('button');
  importButton.textContent = 'Import';
  importButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      actions.onImport?.(file);
    }
    event.target.value = '';
  });

  const undoButton = document.createElement('button');
  undoButton.textContent = 'Undo';
  undoButton.disabled = true;
  undoButton.addEventListener('click', () => actions.onUndo?.());

  const redoButton = document.createElement('button');
  redoButton.textContent = 'Redo';
  redoButton.disabled = true;
  redoButton.addEventListener('click', () => actions.onRedo?.());

  header.append(title, backendTag, pickerButton, importButton, undoButton, redoButton, fileInput);

  const viewport = document.createElement('div');
  viewport.className = 'viewport-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'viewport-canvas';
  viewport.appendChild(canvas);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = '<strong>Backend</strong><div class="hud-backend">-</div><div class="hud-fps">FPS: --</div><div class="hud-draw">Draws: --</div><div class="hud-storage">Storage: --</div>';
  viewport.appendChild(hud);

  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  viewport.appendChild(toastContainer);

  const panels = document.createElement('div');
  panels.className = 'panels';

  const outliner = createPanel('Outliner');
  const outlinerList = document.createElement('ul');
  outlinerList.className = 'outliner-list';
  outliner.content.appendChild(outlinerList);

  const properties = createPanel('Properties');
  const tabs = document.createElement('div');
  tabs.className = 'properties-tabs';
  const tabNames = ['Object', 'Modifiers', 'Material', 'UV', 'Texture'];
  const tabButtons = tabNames.map((name, idx) => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.tab = name.toLowerCase();
    if (idx === 0) btn.classList.add('active');
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
      actions.onPropertiesTabChange(btn.dataset.tab);
    });
    return btn;
  });
  tabs.append(...tabButtons);
  properties.content.appendChild(tabs);

  const propertiesBody = document.createElement('div');
  propertiesBody.className = 'panel-content';
  propertiesBody.dataset.tab = 'object';
  properties.content.appendChild(propertiesBody);

  panels.append(outliner.element, properties.element);
  viewport.appendChild(panels);

  const toolbar = document.createElement('div');
  toolbar.className = 'bottom-toolbar';
  const toolbarButtons = TOOLBAR_BUTTONS.map((config) => {
    const btn = document.createElement('button');
    btn.textContent = config.label;
    btn.dataset.tool = config.id;
    btn.addEventListener('click', (event) => {
      if (config.id === 'add') {
        actions.showAddMenu(event.currentTarget);
        return;
      }
      if (config.id === 'export') {
        actions.exportProject();
        return;
      }
      setTool(config.id);
      setMode(config.mode);
      actions.onToolChange(config.id, config.mode);
    });
    return btn;
  });
  toolbar.append(...toolbarButtons);

  const primer = document.createElement('div');
  primer.className = 'first-run-overlay';
  const primerCard = document.createElement('div');
  primerCard.className = 'first-run-card';
  const primerTitle = document.createElement('h2');
  primerTitle.textContent = 'Welcome to Mesh Editor';
  const primerList = document.createElement('ul');
  primerList.innerHTML = `
    <li><strong>Edit</strong>: tap Select to pick, double-tap to focus, long-press for context tools (Extrude, Bevel, Loop Cut, Mirror, Subdivide, Decimate).</li>
    <li><strong>UV</strong>: mark seams with long-press, pinch/drag to adjust islands, export layout from the Properties tab.</li>
    <li><strong>Paint</strong>: choose brushes at the bottom, tap-hold to eyedropper, autosaves every minute to your device.</li>
  `;
  const primerButton = document.createElement('button');
  primerButton.textContent = 'Start modeling';
  primerButton.addEventListener('click', () => {
    setPrimerVisible(false);
    primer.remove();
  });
  primerCard.append(primerTitle, primerList, primerButton);
  primer.append(primerCard);

  shell.append(header, viewport, toolbar);
  root.append(shell);
  root.append(primer);

  return {
    canvas,
    toolbarButtons,
    hud,
    toastContainer,
    outlinerList,
    propertiesBody,
    backendTag,
    setHistoryButtons(canUndo, canRedo) {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
    },
    fileInput,
    primer,
    updateToolbar(state) {
      toolbarButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tool === state.tool);
      });
    },
    updateHud(state) {
      hud.querySelector('.hud-backend').textContent = state.backend.toUpperCase();
      hud.querySelector('.hud-fps').textContent = `FPS: ${state.fps.toFixed(0)}`;
      hud.querySelector('.hud-draw').textContent = `Draws: ${state.drawCalls}`;
      const { used, quota } = state.storage;
      hud.querySelector('.hud-storage').textContent = `Storage: ${(used / 1e6).toFixed(1)} / ${(quota / 1e6).toFixed(1)} MB`;
      backendTag.textContent = state.backend.toUpperCase();
    },
    updateOutliner(items, selectionIds) {
      outlinerList.innerHTML = '';
      for (const item of items) {
        const li = document.createElement('li');
        li.textContent = item.label;
        li.dataset.id = item.id;
        if (selectionIds.includes(item.id)) {
          li.classList.add('active');
        }
        li.addEventListener('click', () => actions.onOutlinerSelect(item.id));
        outlinerList.appendChild(li);
      }
    },
    updateProperties(tab, element) {
      propertiesBody.dataset.tab = tab;
      propertiesBody.replaceChildren(element);
    },
    showPrimer(visible) {
      primer.style.display = visible ? 'flex' : 'none';
    },
    showToast(message, timeout = 2500) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), timeout);
    },
    showContextMenu(anchorRect, options) {
      const existing = document.querySelector('.context-menu');
      existing?.remove();
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      for (const option of options) {
        const btn = document.createElement('button');
        btn.textContent = option.label;
        btn.addEventListener('click', () => {
          option.onSelect();
          menu.remove();
        });
        menu.appendChild(btn);
      }
      document.body.appendChild(menu);
      const { x, y } = anchorRect;
      const bounds = menu.getBoundingClientRect();
      const preferredTop = y - bounds.height - 8;
      const finalTop = preferredTop > 16 ? preferredTop : y + 8;
      menu.style.left = `${Math.max(12, x)}px`;
      menu.style.top = `${finalTop}px`;
      document.addEventListener('pointerdown', () => menu.remove(), { once: true });
    }
  };
}

function createPanel(title) {
  const element = document.createElement('section');
  element.className = 'panel';
  const header = document.createElement('header');
  header.textContent = title;
  const content = document.createElement('div');
  content.className = 'panel-content';
  element.append(header, content);
  return { element, content };
}
