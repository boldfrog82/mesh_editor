const listeners = new Set();

const defaultState = {
  ready: false,
  backend: 'webgl2',
  fps: 0,
  drawCalls: 0,
  storage: { used: 0, quota: 0 },
  projects: [],
  currentProject: null,
  mode: 'object',
  tool: 'select',
  showPrimer: true,
  selection: { type: 'object', ids: [] },
  history: { canUndo: false, canRedo: false },
  modifiers: [],
  statusMessage: '',
  autosave: { enabled: true, interval: 60000, lastSaved: null },
  renderer: { useWebGPU: false, resolutionScale: 1, lod: true, frustumCulling: true, shadows: true, batterySaver: false }
};

let state = structuredClone(defaultState);

export const store = {
  getState: () => state,
  reset() {
    state = structuredClone(defaultState);
    emit();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  patch(partial) {
    state = { ...state, ...partial };
    emit();
  },
  update(updater) {
    state = updater(state);
    emit();
  }
};

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setBackend(backend) {
  store.update((s) => ({ ...s, backend }));
}

export function setRendererOptions(options) {
  store.update((s) => ({ ...s, renderer: { ...s.renderer, ...options } }));
}

export function setStats({ fps, drawCalls }) {
  store.update((s) => ({ ...s, fps, drawCalls }));
}

export function setStorageUsage(storage) {
  store.update((s) => ({ ...s, storage }));
}

export function setMode(mode) {
  store.update((s) => ({ ...s, mode }));
}

export function setTool(tool) {
  store.update((s) => ({ ...s, tool }));
}

export function setSelection(selection) {
  store.update((s) => ({ ...s, selection }));
}

export function setProjects(projects) {
  store.update((s) => ({ ...s, projects }));
}

export function setCurrentProject(currentProject) {
  store.update((s) => ({ ...s, currentProject }));
}

export function setHistory(history) {
  store.update((s) => ({ ...s, history }));
}

export function setModifiers(modifiers) {
  store.update((s) => ({ ...s, modifiers }));
}

export function setReady(value) {
  store.update((s) => ({ ...s, ready: value }));
}

export function setPrimerVisible(showPrimer) {
  store.update((s) => ({ ...s, showPrimer }));
}

export function setStatusMessage(statusMessage) {
  store.update((s) => ({ ...s, statusMessage }));
}

export function setAutosave(meta) {
  store.update((s) => ({ ...s, autosave: { ...s.autosave, ...meta } }));
}
