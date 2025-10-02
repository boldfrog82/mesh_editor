import { setToast } from '../app/state.js';

export class UVEngine {
  constructor(scene, meshEngine) {
    this.scene = scene;
    this.meshEngine = meshEngine;
    this.mode = 'object';
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'uv') {
      setToast('UV mode - preview coming soon');
    }
  }

  update() {}

  autoUnwrap() {
    setToast('Auto unwrap not implemented yet');
  }

  exportLayout() {
    setToast('UV layout export not implemented yet');
  }
}
