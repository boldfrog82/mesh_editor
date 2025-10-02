import { getState } from '../app/state.js';

export class StatusPanel {
  constructor() {
    this.element = document.createElement('aside');
    this.element.className = 'status-panel';
    this.element.innerHTML = `
      <h2>Status</h2>
      <div class="status-metrics">
        <span><small>Backend</small><strong id="statusBackend">-</strong></span>
        <span><small>FPS</small><strong id="statusFps">0</strong></span>
        <span><small>Draw calls</small><strong id="statusDraw">0</strong></span>
        <span><small>Storage</small><strong id="statusStorage">0</strong></span>
      </div>
    `;
    this.backendLabel = this.element.querySelector('#statusBackend');
    this.fpsLabel = this.element.querySelector('#statusFps');
    this.drawLabel = this.element.querySelector('#statusDraw');
    this.storageLabel = this.element.querySelector('#statusStorage');
    this.runtime = null;
  }

  setRuntime(runtime) {
    this.runtime = runtime;
  }

  update({ fps, drawCalls }) {
    if (fps !== undefined) this.fpsLabel.textContent = fps.toFixed(0);
    if (drawCalls !== undefined) this.drawLabel.textContent = drawCalls.toFixed(0);
  }

  render(state = getState()) {
    this.backendLabel.textContent = state.backend;
    this.fpsLabel.textContent = state.fps.toFixed(0);
    this.drawLabel.textContent = state.drawCalls.toFixed(0);
    const { used, quota } = state.storageUsage;
    this.storageLabel.textContent = `${(used / 1024 / 1024).toFixed(1)} / ${(quota / 1024 / 1024).toFixed(1)} MB`;
  }
}
