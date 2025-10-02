import { setToast } from '../app/state.js';

export class ModifiersEngine {
  constructor(meshEngine) {
    this.meshEngine = meshEngine;
  }

  apply(name, options = {}) {
    this.meshEngine.applyOperation(name, options);
  }
}
