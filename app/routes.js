import { setActiveMode, getState } from './state.js';

const listeners = new Set();

export function changeMode(mode) {
  const { activeMode } = getState();
  if (activeMode === mode) return;
  setActiveMode(mode);
  listeners.forEach((cb) => cb(mode));
}

export function onModeChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
