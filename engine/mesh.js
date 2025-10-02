import { setToast } from '../app/state.js';

const PRIMITIVES = {
  box: () => ({ builder: BABYLON.MeshBuilder.CreateBox, params: { size: 1 } }),
  sphere: () => ({ builder: BABYLON.MeshBuilder.CreateSphere, params: { diameter: 1.5, segments: 16 } }),
  cylinder: () => ({ builder: BABYLON.MeshBuilder.CreateCylinder, params: { height: 2, diameter: 1 } }),
  plane: () => ({ builder: BABYLON.MeshBuilder.CreatePlane, params: { size: 2 } })
};

export class MeshEngine {
  constructor(scene, gizmoManager, shadowGenerator) {
    this.scene = scene;
    this.gizmoManager = gizmoManager;
    this.shadowGenerator = shadowGenerator;
    this.selection = {
      mesh: null,
      selectMesh: (mesh) => this.attachMesh(mesh)
    };
    this.tool = 'select';
    this.mode = 'object';
    this.contextMenu = null;
    this.setupPointerGestures();
    this.autosaveInterval = null;
  }

  setupPointerGestures() {
    let longPressTimeout = null;
    this.scene.onPointerObservable.add((info) => {
      if (info.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        if (longPressTimeout) clearTimeout(longPressTimeout);
        longPressTimeout = setTimeout(() => {
          this.showContextMenu(info.pickInfo);
        }, 600);
      }
      if (info.type === BABYLON.PointerEventTypes.POINTERUP) {
        if (longPressTimeout) {
          clearTimeout(longPressTimeout);
          longPressTimeout = null;
        }
        if (info.pickInfo?.hit) {
          const mesh = info.pickInfo.pickedMesh;
          if (mesh && mesh.metadata?.isEditable) {
            this.attachMesh(mesh);
          }
        }
      }
    });
  }

  showContextMenu(pickInfo) {
    if (!pickInfo?.hit) return;
    this.attachMesh(pickInfo.pickedMesh);
    setToast('Context menu actions coming soon');
  }

  attachMesh(mesh) {
    if (!mesh) return;
    this.selection.mesh = mesh;
    this.gizmoManager.attachToMesh(mesh);
    setToast(`Selected ${mesh.name}`);
  }

  setTool(tool) {
    this.tool = tool;
  }

  setMode(mode) {
    this.mode = mode;
  }

  handlePointer(pointerInfo, mode, tool) {
    // Selection handled in setupPointerGestures
  }

  handlePropertiesTab(tab) {
    setToast(`Properties: ${tab}`);
  }

  update() {}

  createPrimitive(type = 'box') {
    const primitive = PRIMITIVES[type];
    if (!primitive) return;
    const { builder, params } = primitive();
    const mesh = builder(`${type}-${Date.now()}`, params, this.scene);
    mesh.metadata = { isEditable: true, type };
    mesh.position.y = params.height ? params.height / 2 : 0.5;
    this.shadowGenerator.addShadowCaster(mesh);
    this.attachMesh(mesh);
    return mesh;
  }

  applyOperation(name, options = {}) {
    setToast(`${name} not implemented yet`, 2000);
  }

  async loadProject(project) {
    setToast(`Loaded project ${project.name}`);
  }
}
