import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Materials/standardMaterial';

import { ModelingEngine } from './modeling/modeler.js';
import { setBackend, setStats } from '../app/state.js';

const FRAME_SAMPLES = 30;

export class Runtime {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.modeling = null;
    this.statsQueue = [];
    this.activeBackend = 'webgl2';
  }

  async init(preferWebGPU = true) {
    this.engine = await createEngine(this.canvas, preferWebGPU);
    this.activeBackend = this.engine.isWebGPU ? 'webgpu' : 'webgl2';
    setBackend(this.activeBackend);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color3.FromHexString('#0f172a').toColor4(1);
    this.scene.environmentIntensity = 0.7;
    this.camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3, 8, new Vector3(0, 1, 0), this.scene);
    this.camera.wheelPrecision = 12;
    this.camera.panningSensibility = 2600;
    this.camera.lowerRadiusLimit = 0.5;
    this.camera.upperRadiusLimit = 200;
    this.camera.attachControl(this.canvas, true);

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.7;
    const dir = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.6), this.scene);
    dir.intensity = 1.0;

    this.modeling = new ModelingEngine(this.scene);
    this.modeling.ensureMesh();
    this._setupGestures();
    this._startRenderLoop();
  }

  _setupGestures() {
    let lastPointerPosition = null;
    let lastPinchDistance = null;
    const activePointers = new Map();
    let longPressTimer = null;

    const onPointerDown = (event) => {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.canvas.setPointerCapture(event.pointerId);
      if (activePointers.size === 1) {
        lastPointerPosition = { x: event.clientX, y: event.clientY };
        longPressTimer = window.setTimeout(() => {
          const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, Matrix.IdentityReadOnly, this.camera);
          const face = this.modeling.pickFace(ray);
          if (face !== -1) {
            this.onContextMenu?.({ x: event.clientX, y: event.clientY }, face);
          }
        }, 600);
      } else if (activePointers.size === 2) {
        lastPinchDistance = pointerDistance(activePointers);
        clearTimeout(longPressTimer);
      }
    };

    const onPointerMove = (event) => {
      if (!activePointers.has(event.pointerId)) return;
      if (activePointers.size === 1 && lastPointerPosition) {
        const dx = event.clientX - lastPointerPosition.x;
        const dy = event.clientY - lastPointerPosition.y;
        this.camera.alpha -= dx * 0.005;
        this.camera.beta -= dy * 0.005;
        this.camera.beta = Math.min(Math.max(0.1, this.camera.beta), Math.PI / 1.2);
        lastPointerPosition = { x: event.clientX, y: event.clientY };
        clearTimeout(longPressTimer);
      } else if (activePointers.size >= 2 && lastPinchDistance != null) {
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const currentDistance = pointerDistance(activePointers);
        const delta = currentDistance - lastPinchDistance;
        this.camera.radius -= delta * 0.01;
        this.camera.radius = Math.max(this.camera.lowerRadiusLimit, Math.min(this.camera.upperRadiusLimit, this.camera.radius));
        lastPinchDistance = currentDistance;
        return;
      }
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };

    const onPointerUp = (event) => {
      activePointers.delete(event.pointerId);
      this.canvas.releasePointerCapture(event.pointerId);
      lastPointerPosition = null;
      lastPinchDistance = null;
      clearTimeout(longPressTimer);
      longPressTimer = null;
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  _startRenderLoop() {
    let lastTime = performance.now();
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      this.scene.render();
      this.statsQueue.push(delta);
      if (this.statsQueue.length > FRAME_SAMPLES) {
        this.statsQueue.shift();
      }
      const avgDelta = this.statsQueue.reduce((sum, value) => sum + value, 0) / Math.max(1, this.statsQueue.length);
      const fps = 1000 / avgDelta;
      const drawCalls = this.scene.getEngine()._drawCalls ?? 0;
      setStats({ fps, drawCalls });
    });
  }
}

async function createEngine(canvas, preferWebGPU) {
  if (preferWebGPU && navigator.gpu) {
    try {
      const engine = new WebGPUEngine(canvas, { antialias: true });
      await engine.initAsync();
      engine.isWebGPU = true;
      return engine;
    } catch (err) {
      console.warn('WebGPU init failed, falling back to WebGL2', err);
    }
  }
  const engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: true, stencil: true });
  engine.isWebGPU = false;
  return engine;
}

function pointerDistance(map) {
  if (map.size < 2) return 0;
  const points = Array.from(map.values());
  const a = points[0];
  const b = points[1];
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
