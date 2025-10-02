const subscribers = new Set();

const initialState = {
  engineReady: false,
  backend: 'initialising',
  fps: 0,
  drawCalls: 0,
  storageUsage: {
    used: 0,
    quota: 0
  },
  activeTool: 'select',
  activeMode: 'object',
  panels: {
    active: 'outliner',
    propertiesTab: 'object'
  },
  projects: [],
  currentProject: null,
  showFirstRun: true,
  toast: null
};

let state = { ...initialState };

export function getState() {
  return state;
}

export function updateState(patch) {
  state = { ...state, ...patch };
  subscribers.forEach((cb) => cb(state));
}

export function subscribe(cb) {
  subscribers.add(cb);
  cb(state);
  return () => subscribers.delete(cb);
}

export function setToast(message, duration = 3000) {
  updateState({ toast: message });
  if (duration > 0) {
    setTimeout(() => {
      updateState({ toast: null });
    }, duration);
  }
}

export function setPanelActive(id) {
  updateState({ panels: { ...state.panels, active: id } });
}

export function setPropertiesTab(tab) {
  updateState({ panels: { ...state.panels, propertiesTab: tab } });
}

export function setActiveTool(tool) {
  updateState({ activeTool: tool });
}

export function setActiveMode(mode) {
  updateState({ activeMode: mode });
}

export function markEngineReady(backend) {
  updateState({ engineReady: true, backend });
}

export function updatePerf({ fps, drawCalls }) {
  updateState({ fps, drawCalls });
}

export function updateStorageUsage(usage) {
  updateState({ storageUsage: usage });
}

export function setProjects(projects) {
  updateState({ projects });
}

export function setCurrentProject(project) {
  updateState({ currentProject: project });
}

export function dismissFirstRun() {
  updateState({ showFirstRun: false });
}
