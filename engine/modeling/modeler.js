import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EditableMesh } from './editable-mesh.js';
import { HistoryStack } from './history.js';
import { setHistory, setModifiers, setSelection, setStatusMessage } from '../../app/state.js';

const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `mod-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`);

export class ModelingEngine {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.editable = null;
    this.history = new HistoryStack();
    this.modifiers = [];
    this.selection = { faces: new Set(), vertices: new Set(), edges: new Set() };
    this.material = new StandardMaterial('editable-mat', this.scene);
    this.material.diffuseColor = new Color3(0.7, 0.75, 0.82);
    this.material.specularColor = new Color3(0.1, 0.1, 0.1);
  }

  ensureMesh() {
    if (!this.mesh) {
      this.mesh = new Mesh('EditableMesh', this.scene);
      this.mesh.material = this.material;
    }
  }

  loadEditable(editable) {
    this.editable = editable.clone();
    this.history = new HistoryStack();
    this.history.snapshot(this.editable.clone());
    this.modifiers = [];
    this.selection = { faces: new Set(), vertices: new Set(), edges: new Set() };
    this.applyToScene();
    setHistory({ canUndo: this.history.canUndo(), canRedo: this.history.canRedo() });
    setModifiers([]);
    setSelection({ type: 'object', ids: [] });
  }

  createPrimitive(type, params) {
    const primitive = EditableMesh.createPrimitive(type, params);
    this.loadEditable(primitive);
    setStatusMessage(`${type} created`);
    return this.mesh;
  }

  applyToScene() {
    if (!this.editable) return;
    const data = this.editable.toVertexData();
    const vertexData = new VertexData();
    vertexData.positions = data.positions;
    vertexData.indices = data.indices;
    vertexData.normals = data.normals;
    vertexData.uvs = data.uvs;
    this.ensureMesh();
    vertexData.applyToMesh(this.mesh, true);
    this.mesh.markVerticesDataUpdated(VertexBuffer.PositionKind);
    this.mesh.markVerticesDataUpdated(VertexBuffer.NormalKind);
    this.mesh.markVerticesDataUpdated(VertexBuffer.UVKind);
  }

  commitModifier(type, params, operation) {
    if (!this.editable) return;
    operation();
    this.modifiers.push({ type, params, pending: true, id: uuid() });
    this.applyToScene();
    this.history.snapshot(this.editable.clone());
    setHistory({ canUndo: this.history.canUndo(), canRedo: this.history.canRedo() });
    setModifiers(this.modifiers.slice());
    setStatusMessage(`${type} added`);
  }

  selectFace(faceId) {
    if (!this.editable) return;
    this.selection.faces = new Set([faceId]);
    setSelection({ type: 'face', ids: [faceId] });
  }

  selectVertex(vertexId) {
    if (!this.editable) return;
    this.selection.vertices = new Set([vertexId]);
    setSelection({ type: 'vertex', ids: [vertexId] });
  }

  clearSelection() {
    this.selection = { faces: new Set(), vertices: new Set(), edges: new Set() };
    setSelection({ type: 'object', ids: [] });
  }

  extrudeSelected(distance = 0.25) {
    const faces = Array.from(this.selection.faces.size ? this.selection.faces : new Set([0]));
    this.commitModifier('Extrude', { faces, distance }, () => this.editable.extrudeFaces(faces, distance));
  }

  insetSelected(amount = 0.1) {
    const faces = Array.from(this.selection.faces.size ? this.selection.faces : new Set([0]));
    this.commitModifier('Inset', { faces, amount }, () => this.editable.insetFaces(faces, amount));
  }

  bevelSelected(width = 0.1) {
    const edges = this.selection.edges.size ? Array.from(this.selection.edges) : [];
    if (!edges.length && this.selection.faces.size) {
      for (const faceIndex of this.selection.faces) {
        const face = this.editable.faces[faceIndex];
        for (let i = 0; i < face.length; i++) {
          edges.push([face[i], face[(i + 1) % face.length]]);
        }
      }
    }
    if (!edges.length) return;
    this.commitModifier('Bevel', { edges, width }, () => this.editable.bevelEdges(edges, width));
  }

  loopCut(axis = 'x', t = 0.5) {
    this.commitModifier('Loop Cut', { axis, t }, () => this.editable.loopCut(axis, t));
  }

  mergeVertices(vertexIds, position) {
    const ids = vertexIds.length ? vertexIds : Array.from(this.selection.vertices);
    if (!ids.length) return;
    this.commitModifier('Merge', { vertexIds: ids, position }, () => this.editable.mergeVertices(ids, { position }));
  }

  mirror(axis = 'x') {
    this.commitModifier('Mirror', { axis }, () => this.editable.mirror(axis));
  }

  subdivide(iterations = 1) {
    this.commitModifier('Subdivision', { iterations }, () => this.editable.subdivide(iterations));
  }

  decimate(ratio = 0.5) {
    this.commitModifier('Decimate', { ratio }, () => this.editable.decimate(ratio));
  }

  applyModifiers() {
    this.modifiers = this.modifiers.map((modifier) => ({ ...modifier, pending: false }));
    setModifiers(this.modifiers.slice());
    setStatusMessage('Modifiers applied');
  }

  undo() {
    if (!this.history.canUndo()) return;
    const previous = this.history.undo(this.editable);
    this.editable = previous.clone();
    this.applyToScene();
    if (this.modifiers.length) {
      this.modifiers.pop();
      setModifiers(this.modifiers.slice());
    }
    setHistory({ canUndo: this.history.canUndo(), canRedo: this.history.canRedo() });
  }

  redo() {
    if (!this.history.canRedo()) return;
    const next = this.history.redo(this.editable);
    this.editable = next.clone();
    this.applyToScene();
    setHistory({ canUndo: this.history.canUndo(), canRedo: this.history.canRedo() });
  }

  pickFace(ray) {
    if (!this.mesh) return -1;
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh === this.mesh, false);
    if (pick?.faceId != null) {
      const faceIndex = Math.floor(pick.faceId / 2);
      this.selectFace(faceIndex);
      return faceIndex;
    }
    return -1;
  }

  getVertexPosition(index) {
    return this.editable?.vertices[index]?.position ?? Vector3.Zero();
  }
}
