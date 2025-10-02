import { updatePerf, setToast } from '../app/state.js';
import { MeshEngine } from './mesh.js';
import { UVEngine } from './uv.js';
import { PaintEngine } from './paint.js';
import { ModifiersEngine } from './modifiers.js';
import { GLBIO } from '../io/glb.js';

async function ensureBabylon() {
  if (window.BABYLON) return;
  const { babylonBaseUrl } = window.__MESH_EDITOR_CONFIG__ || {};
  const scripts = [
    `${babylonBaseUrl}/babylon.js`,
    `${babylonBaseUrl}/babylonjs.loaders.js`,
    `${babylonBaseUrl}/babylon.gui.min.js`,
    `${babylonBaseUrl}/babylonjs.materials.min.js`,
    `${babylonBaseUrl}/babylonjs.serializers.min.js`
  ];
  for (const src of scripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

async function createEngine(canvas) {
  await ensureBabylon();
  const useWebGPU = !!window.navigator.gpu && BABYLON.WebGPUEngine && (await BABYLON.WebGPUEngine.IsSupportedAsync);
  if (useWebGPU) {
    const engine = new BABYLON.WebGPUEngine(canvas);
    await engine.initAsync();
    return { engine, backend: 'WebGPU' };
  }
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  return { engine, backend: 'WebGL2' };
}

function setupScene(engine) {
  const scene = new BABYLON.Scene(engine);
  scene.metadata = scene.metadata || {};
  scene.metadata.type = 'mesh-editor';
  scene.useRightHandedSystem = false;

  const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 12, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(engine.getRenderingCanvas(), true);
  camera.wheelPrecision = 60;
  camera.panningSensibility = 250;
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 150;

  const light = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.5, 1, 0.5), scene);
  light.intensity = 1.2;

  const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.6, -1, -0.8), scene);
  dir.intensity = 1.0;

  const shadowGenerator = new BABYLON.ShadowGenerator(2048, dir);
  shadowGenerator.usePercentageCloserFiltering = true;

  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 40, height: 40 }, scene);
  ground.isPickable = false;
  const gridMaterial = new BABYLON.GridMaterial('grid', scene);
  gridMaterial.majorUnitFrequency = 1;
  gridMaterial.minorUnitVisibility = 0.3;
  gridMaterial.gridRatio = 1;
  gridMaterial.opacity = 0.85;
  gridMaterial.backFaceCulling = false;
  ground.material = gridMaterial;

  const gizmoManager = new BABYLON.GizmoManager(scene);
  gizmoManager.clearGizmoOnEmptyPointerEvent = true;
  gizmoManager.usePointerToAttachGizmos = true;

  return { scene, camera, gizmoManager, shadowGenerator };
}

export async function initRuntime(canvas, { onBackendChanged, onFrameStats }) {
  const { engine, backend } = await createEngine(canvas);
  onBackendChanged(backend);
  const { scene, camera, gizmoManager, shadowGenerator } = setupScene(engine);

  const meshEngine = new MeshEngine(scene, gizmoManager, shadowGenerator);
  const uvEngine = new UVEngine(scene, meshEngine);
  const paintEngine = new PaintEngine(scene, meshEngine);
  const modifiers = new ModifiersEngine(meshEngine);
  const glb = new GLBIO(scene, meshEngine);

  let activeTool = 'select';
  let activeMode = 'object';

  gizmoManager.positionGizmoEnabled = true;
  gizmoManager.rotationGizmoEnabled = false;
  gizmoManager.scaleGizmoEnabled = false;

  scene.onPointerObservable.add((pointerInfo) => {
    meshEngine.handlePointer(pointerInfo, activeMode, activeTool);
  });

  scene.onBeforeRenderObservable.add(() => {
    meshEngine.update();
    uvEngine.update();
    paintEngine.update();
  });

  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const delta = now - lastTime;
    if (delta >= 500) {
      const fps = engine.getFps();
      const drawCalls = engine.drawCalls;
      updatePerf({ fps, drawCalls });
      if (onFrameStats) onFrameStats({ fps, drawCalls });
      lastTime = now;
    }
    scene.render();
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });

  const runtime = {
    engine,
    scene,
    camera,
    gizmoManager,
    mesh: meshEngine,
    uv: uvEngine,
    paint: paintEngine,
    modifiers,
    selection: meshEngine.selection,
    tools: {
      activate(tool) {
        activeTool = tool;
        meshEngine.setTool(tool);
        if (tool === 'move') {
          gizmoManager.positionGizmoEnabled = true;
          gizmoManager.rotationGizmoEnabled = false;
          gizmoManager.scaleGizmoEnabled = false;
        } else if (tool === 'rotate') {
          gizmoManager.positionGizmoEnabled = false;
          gizmoManager.rotationGizmoEnabled = true;
          gizmoManager.scaleGizmoEnabled = false;
        } else if (tool === 'scale') {
          gizmoManager.positionGizmoEnabled = false;
          gizmoManager.rotationGizmoEnabled = false;
          gizmoManager.scaleGizmoEnabled = true;
        } else {
          gizmoManager.positionGizmoEnabled = false;
          gizmoManager.rotationGizmoEnabled = false;
          gizmoManager.scaleGizmoEnabled = false;
        }
      }
    },
    modes: {
      change(mode) {
        activeMode = mode;
        meshEngine.setMode(mode);
        uvEngine.setMode(mode);
        paintEngine.setMode(mode);
        setToast(`Mode: ${mode}`);
      }
    },
    properties: {
      changeTab(tab) {
        meshEngine.handlePropertiesTab(tab);
      }
    },
    projects: {
      async load(project) {
        await meshEngine.loadProject(project);
      },
      async exportProject(project) {
        await glb.exportProject(project);
      }
    },
    glb,
    destroy() {
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    }
  };

  return runtime;
}
