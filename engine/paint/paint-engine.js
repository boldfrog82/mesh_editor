import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';

const DEFAULT_SIZE = 2048;

export class PaintEngine {
  constructor(scene, modeling) {
    this.scene = scene;
    this.modeling = modeling;
    this.size = DEFAULT_SIZE;
    this.brush = { size: 32, flow: 1, hardness: 0.8, opacity: 1, color: '#ffffff' };
    this.layers = [];
    this.activeLayer = 0;
    this.isPainting = false;
    this.lastUV = null;
    this.dynamicTexture = null;
    this._initTexture();
  }

  _initTexture() {
    this.dynamicTexture = new DynamicTexture('paint-base', { width: this.size, height: this.size }, this.scene, false);
    this.dynamicTexture.hasAlpha = true;
    const ctx = this.dynamicTexture.getContext();
    ctx.fillStyle = '#00000000';
    ctx.fillRect(0, 0, this.size, this.size);
    this.dynamicTexture.update();
    if (this.modeling.mesh) {
      const material = this.modeling.mesh.material;
      material.diffuseTexture = this.dynamicTexture;
      material.diffuseColor = new Color3(1, 1, 1);
    }
    this.layers = [ctx];
  }

  setBrush(options) {
    this.brush = { ...this.brush, ...options };
  }

  beginStroke(uv) {
    this.isPainting = true;
    this.lastUV = uv;
    this._drawDot(uv);
  }

  moveStroke(uv) {
    if (!this.isPainting || !this.lastUV) return;
    this._drawLine(this.lastUV, uv);
    this.lastUV = uv;
  }

  endStroke() {
    this.isPainting = false;
    this.lastUV = null;
    this.dynamicTexture.update();
  }

  fill(color) {
    const ctx = this.dynamicTexture.getContext();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.size, this.size);
    this.dynamicTexture.update();
  }

  eyedropper(uv) {
    const ctx = this.dynamicTexture.getContext();
    const x = Math.floor(uv[0] * this.size);
    const y = Math.floor((1 - uv[1]) * this.size);
    const data = ctx.getImageData(x, y, 1, 1).data;
    this.brush.color = `rgba(${data[0]},${data[1]},${data[2]},${data[3] / 255})`;
    return this.brush.color;
  }

  _drawDot(uv) {
    const ctx = this.dynamicTexture.getContext();
    const x = uv[0] * this.size;
    const y = (1 - uv[1]) * this.size;
    const radius = this.brush.size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.brush.color);
    gradient.addColorStop(this.brush.hardness, this.brush.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = this.brush.opacity;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawLine(from, to) {
    const segments = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * this.size / this.brush.size);
    for (let i = 0; i <= segments; i++) {
      const t = i / Math.max(1, segments);
      const u = from[0] + (to[0] - from[0]) * t;
      const v = from[1] + (to[1] - from[1]) * t;
      this._drawDot([u, v]);
    }
  }

  async exportPNG() {
    const canvas = this.dynamicTexture.getContext().canvas;
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  getPixelData() {
    const canvas = this.dynamicTexture.getContext();
    const image = canvas.getImageData(0, 0, this.size, this.size);
    return new Uint8Array(image.data.buffer.slice(0));
  }
}
