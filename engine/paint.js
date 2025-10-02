import { setToast } from '../app/state.js';

export class PaintEngine {
  constructor(scene, meshEngine) {
    this.scene = scene;
    this.meshEngine = meshEngine;
    this.mode = 'object';
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'paint') {
      setToast('Paint mode - tools coming soon');
    }
  }

  update() {}

  saveTexture() {
    setToast('Texture save not implemented yet');
  }
}
