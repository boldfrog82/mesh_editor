import styles from './main.css';
import { store, setReady, setStatusMessage, setProjects, setCurrentProject, setAutosave, setStorageUsage } from './state.js';
import { createLayout } from '../ui/layout.js';
import { createProjectPicker } from '../ui/project-picker.js';
import { Runtime } from '../engine/runtime.js';
import { UVEngine } from '../engine/uv/uv-engine.js';
import { PaintEngine } from '../engine/paint/paint-engine.js';
import { EditableMesh } from '../engine/modeling/editable-mesh.js';
import { listProjects, saveProject, loadProject, deleteProject, storageEstimate } from '../storage/opfs.js';
import { exportGLB, importGLB } from '../io/glb.js';
import { encodeRGBAtoKTX2 } from '../io/ktx2.js';

const styleTag = document.createElement('style');
styleTag.textContent = styles;
document.head.appendChild(styleTag);

const root = document.getElementById('app-root');
let currentTab = 'object';
let runtime;
const picker = createProjectPicker();
let uvEngine;
let paintEngine;
let autosaveTimer = null;
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `proj-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`);
let lastStatusMessage = '';

const layout = createLayout(root, {
  openProjectPicker: () => showProjectPicker(),
  showAddMenu: (anchor) => showAddMenu(anchor),
  exportProject: () => exportActiveProject(),
  onToolChange: (tool, mode) => onToolChange(tool, mode),
  onPropertiesTabChange: (tab) => {
    currentTab = tab;
    renderProperties();
  },
  onOutlinerSelect: (id) => {
    runtime.modeling.selectFace(Number(id));
  },
  onImport: (file) => importFromFile(file),
  onUndo: () => runtime.modeling.undo(),
  onRedo: () => runtime.modeling.redo()
});

runtime = new Runtime(layout.canvas);

(async function bootstrap() {
  await runtime.init(true);
  uvEngine = new UVEngine(runtime.modeling);
  paintEngine = new PaintEngine(runtime.scene, runtime.modeling);
  runtime.modeling.createPrimitive('box');
  runtime.onContextMenu = (position, face) => {
    if (face >= 0) {
      runtime.modeling.selectFace(face);
    }
    layout.showContextMenu({ x: position.x, y: position.y }, contextOptions(face));
  };
  attachViewportEvents();
  await refreshProjects();
  scheduleAutosave();
  await refreshStorageEstimate();
  if (!navigator.storage?.getDirectory) {
    layout.showToast('OPFS not available. Projects will not persist.', 4500);
  }
  setReady(true);
})();

store.subscribe((state) => {
  layout.updateToolbar(state);
  layout.updateHud({ ...state, fps: state.fps || 0, drawCalls: state.drawCalls || 0 });
  layout.showPrimer(state.showPrimer);
  renderOutliner();
  renderProperties();
  if (state.statusMessage && state.statusMessage !== lastStatusMessage) {
    layout.showToast(state.statusMessage);
    lastStatusMessage = state.statusMessage;
    setStatusMessage('');
    lastStatusMessage = '';
  }
  layout.setHistoryButtons(state.history.canUndo, state.history.canRedo);
});

async function refreshProjects() {
  const projects = await listProjects();
  setProjects(projects);
}

async function showProjectPicker() {
  const projects = store.getState().projects;
  picker.show(projects, {
    onCreate: async () => {
      runtime.modeling.createPrimitive('box');
      setCurrentProject({ id: uuid(), name: 'Untitled' });
      await refreshProjects();
      scheduleAutosave();
    },
    onOpen: async (project) => {
      const data = await loadProject(project.id);
      if (data?.glb) {
        await importFromBuffer(data.glb);
      }
      setCurrentProject(project);
      scheduleAutosave();
    },
    onDelete: async (project) => {
      await deleteProject(project.id);
      await refreshProjects();
    }
  });
}

function showAddMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  layout.showContextMenu(rect, [
    { label: 'Box', onSelect: () => runtime.modeling.createPrimitive('box') },
    { label: 'Sphere', onSelect: () => runtime.modeling.createPrimitive('sphere') },
    { label: 'Cylinder', onSelect: () => runtime.modeling.createPrimitive('cylinder') },
    { label: 'Plane', onSelect: () => runtime.modeling.createPrimitive('plane') }
  ]);
}

function contextOptions(face) {
  return [
    { label: 'Extrude', onSelect: () => runtime.modeling.extrudeSelected(0.25) },
    { label: 'Inset', onSelect: () => runtime.modeling.insetSelected(0.1) },
    { label: 'Bevel', onSelect: () => runtime.modeling.bevelSelected(0.1) },
    { label: 'Loop Cut', onSelect: () => runtime.modeling.loopCut('x', 0.5) },
    { label: 'Mirror X', onSelect: () => runtime.modeling.mirror('x') },
    { label: 'Subdivision', onSelect: () => runtime.modeling.subdivide(1) },
    { label: 'Decimate', onSelect: () => runtime.modeling.decimate(0.5) }
  ];
}

function onToolChange(tool, mode) {
  if (mode === 'uv') {
    uvEngine.autoUnwrap();
  }
}

async function exportActiveProject() {
  const glb = await exportGLB(runtime.scene, { name: 'mesh' });
  const blob = new Blob([glb], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mesh.glb';
  a.click();
  URL.revokeObjectURL(url);
  setStatusMessage('Export complete');
}

async function importFromFile(file) {
  const buffer = await file.arrayBuffer();
  await importFromBuffer(buffer);
  setStatusMessage(`Imported ${file.name}`);
}

async function importFromBuffer(buffer) {
  const result = await importGLB(buffer, runtime.scene);
  const mesh = result.meshes.find((m) => m !== runtime.modeling.mesh && m.getTotalVertices?.() > 0);
  if (mesh) {
    const editable = EditableMesh.fromBabylonMesh(mesh);
    runtime.modeling.loadEditable(editable);
    result.meshes.forEach((m) => {
      if (m !== runtime.modeling.mesh) m.dispose();
    });
    return editable;
  }
}

function renderOutliner() {
  const items = runtime.modeling?.editable?.faces?.map((face, index) => ({ id: index, label: `Face ${index}` })) ?? [];
  const selection = Array.from(runtime.modeling?.selection?.faces ?? []);
  layout.updateOutliner(items, selection);
}

function renderProperties() {
  const container = document.createElement('div');
  container.className = 'panel-content';
  switch (currentTab) {
    case 'object':
      container.appendChild(propertyRow('Vertices', runtime.modeling.editable?.vertices.length ?? 0));
      container.appendChild(propertyRow('Faces', runtime.modeling.editable?.faces.length ?? 0));
      break;
    case 'modifiers':
      (store.getState().modifiers || []).forEach((modifier) => {
        const row = document.createElement('div');
        row.textContent = `${modifier.type} ${modifier.pending ? '(pending)' : ''}`;
        container.appendChild(row);
      });
      break;
    case 'material':
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = '#ffffff';
      colorInput.addEventListener('change', () => {
        paintEngine.brush.color = colorInput.value;
      });
      container.appendChild(colorInput);
      break;
    case 'uv':
      container.appendChild(button('Auto Unwrap', () => uvEngine.autoUnwrap()));
      container.appendChild(button('Pack Islands', () => uvEngine.packIslands()));
      container.appendChild(button('Export Layout', () => exportUVLayout()));
      break;
    case 'texture':
      container.appendChild(button('Save Texture', async () => {
        const png = await paintEngine.exportPNG();
        const url = URL.createObjectURL(png);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'texture.png';
        a.click();
        URL.revokeObjectURL(url);
      }));
      break;
    default:
      break;
  }
  layout.updateProperties(currentTab, container);
}

function propertyRow(label, value) {
  const row = document.createElement('div');
  row.textContent = `${label}: ${value}`;
  return row;
}

function button(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function attachViewportEvents() {
  const canvas = runtime.engine.getRenderingCanvas();
  canvas.addEventListener('pointerdown', (event) => {
    if (store.getState().mode === 'paint') {
      const pick = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY, (mesh) => mesh === runtime.modeling.mesh);
      if (pick?.getTextureCoordinates()) {
        const uv = pick.getTextureCoordinates();
        paintEngine.beginStroke([uv.x, uv.y]);
      }
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (store.getState().mode === 'paint' && paintEngine.isPainting) {
      const pick = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY, (mesh) => mesh === runtime.modeling.mesh);
      if (pick?.getTextureCoordinates()) {
        const uv = pick.getTextureCoordinates();
        paintEngine.moveStroke([uv.x, uv.y]);
      }
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (store.getState().mode === 'paint') {
      paintEngine.endStroke();
    }
  });
}

async function exportUVLayout() {
  const canvas = uvEngine.exportLayout();
  if (!canvas) return;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uv-layout.png';
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

function scheduleAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(async () => {
    const project = store.getState().currentProject;
    if (!project) return;
    const glb = await exportGLB(runtime.scene, { name: project.name || 'autosave' });
    const png = await paintEngine.exportPNG();
    const textureBuffers = [];
    if (png) {
      const pngBuffer = await png.arrayBuffer();
      const raw = paintEngine.getPixelData();
      const ktx2 = encodeRGBAtoKTX2({ width: paintEngine.size, height: paintEngine.size, data: raw, srgb: true });
      textureBuffers.push({ name: 'baseColor.png', data: pngBuffer });
      textureBuffers.push({ name: 'baseColor.ktx2', data: ktx2 });
    }
    await saveProject(project.id, { name: project.name || 'Autosave', glb, textures: textureBuffers });
    await refreshStorageEstimate();
    setAutosave({ lastSaved: Date.now() });
  }, store.getState().autosave.interval);
}

async function refreshStorageEstimate() {
  const { usage, quota } = await storageEstimate();
  setStorageUsage({ used: usage, quota });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
