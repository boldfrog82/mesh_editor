import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';

const EPSILON = 1e-5;

export class EditableMesh {
  constructor({ vertices = [], faces = [] } = {}) {
    this.vertices = vertices.map((v) => ({
      position: Vector3.FromArray(v.position ?? v),
      normal: v.normal ? Vector3.FromArray(v.normal) : new Vector3(),
      uv: v.uv ? v.uv.slice(0, 2) : [0, 0]
    }));
    this.faces = faces.map((indices) => indices.slice());
    if (!vertices.length && !faces.length) {
      this.vertices = [];
      this.faces = [];
    }
    this._recalculateNormals();
  }

  clone() {
    const vertices = this.vertices.map((v) => ({ position: v.position.clone(), normal: v.normal.clone(), uv: v.uv.slice() }));
    const faces = this.faces.map((f) => f.slice());
    return new EditableMesh({ vertices, faces });
  }

  serializeBinary() {
    const vertexCount = this.vertices.length;
    const faceCount = this.faces.length;
    const indexCount = this.faces.reduce((acc, face) => acc + face.length, 0);
    const buffer = new ArrayBuffer(4 * 4 + vertexCount * 32 + indexCount * 4);
    const view = new DataView(buffer);
    let offset = 0;
    view.setUint32(offset, vertexCount, true);
    offset += 4;
    view.setUint32(offset, faceCount, true);
    offset += 4;
    view.setUint32(offset, indexCount, true);
    offset += 4;
    view.setUint32(offset, 1, true); // version
    offset += 4;
    for (const vertex of this.vertices) {
      view.setFloat32(offset, vertex.position.x, true);
      view.setFloat32(offset + 4, vertex.position.y, true);
      view.setFloat32(offset + 8, vertex.position.z, true);
      view.setFloat32(offset + 12, vertex.normal.x, true);
      view.setFloat32(offset + 16, vertex.normal.y, true);
      view.setFloat32(offset + 20, vertex.normal.z, true);
      view.setFloat32(offset + 24, vertex.uv[0], true);
      view.setFloat32(offset + 28, vertex.uv[1], true);
      offset += 32;
    }
    for (const face of this.faces) {
      view.setUint32(offset, face.length, true);
      offset += 4;
      for (const index of face) {
        view.setUint32(offset, index, true);
        offset += 4;
      }
    }
    return buffer;
  }

  static fromBinary(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    const vertexCount = view.getUint32(offset, true);
    offset += 4;
    const faceCount = view.getUint32(offset, true);
    offset += 4;
    view.getUint32(offset, true);
    offset += 4;
    view.getUint32(offset, true);
    offset += 4;
    const vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const position = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
      const normal = [view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true)];
      const uv = [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true)];
      vertices.push({ position, normal, uv });
      offset += 32;
    }
    const faces = [];
    for (let i = 0; i < faceCount; i++) {
      const count = view.getUint32(offset, true);
      offset += 4;
      const face = [];
      for (let j = 0; j < count; j++) {
        face.push(view.getUint32(offset, true));
        offset += 4;
      }
      faces.push(face);
    }
    return new EditableMesh({ vertices, faces });
  }

  static createPrimitive(type, params = {}) {
    switch (type) {
      case 'box':
        return createBox(params);
      case 'sphere':
        return createSphere(params);
      case 'cylinder':
        return createCylinder(params);
      case 'plane':
      default:
        return createPlane(params);
    }
  }

  static fromBabylonMesh(mesh) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) || [];
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind) || [];
    const uvs = mesh.getVerticesData(VertexBuffer.UVKind) || [];
    const indices = mesh.getIndices() || [];
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3) {
      const vertexIndex = i / 3;
      vertices.push({
        position: [positions[i], positions[i + 1], positions[i + 2]],
        normal: [normals[i], normals[i + 1], normals[i + 2]],
        uv: [uvs[vertexIndex * 2] ?? 0, uvs[vertexIndex * 2 + 1] ?? 0]
      });
    }
    const faces = [];
    for (let i = 0; i < indices.length; i += 3) {
      faces.push([indices[i], indices[i + 1], indices[i + 2]]);
    }
    return new EditableMesh({ vertices, faces });
  }

  toVertexData() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let indexOffset = 0;
    for (const face of this.faces) {
      const base = indexOffset;
      for (const vertexIndex of face) {
        const vertex = this.vertices[vertexIndex];
        positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
        normals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
        uvs.push(vertex.uv[0], vertex.uv[1]);
      }
      if (face.length === 3) {
        indices.push(base, base + 1, base + 2);
      } else if (face.length === 4) {
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      } else {
        for (let i = 1; i < face.length - 1; i++) {
          indices.push(base, base + i, base + i + 1);
        }
      }
      indexOffset += face.length;
    }
    return { positions, normals, uvs, indices };
  }

  _recalculateNormals() {
    for (const vertex of this.vertices) {
      vertex.normal.setAll(0);
    }
    for (const face of this.faces) {
      if (face.length < 3) continue;
      const v0 = this.vertices[face[0]].position;
      const v1 = this.vertices[face[1]].position;
      const v2 = this.vertices[face[2]].position;
      const normal = Vector3.Cross(v1.subtract(v0), v2.subtract(v0)).normalizeToNew();
      for (const index of face) {
        this.vertices[index].normal.addInPlace(normal);
      }
    }
    for (const vertex of this.vertices) {
      if (vertex.normal.lengthSquared() > 0) {
        vertex.normal.normalize();
      } else {
        vertex.normal = new Vector3(0, 1, 0);
      }
    }
  }

  extrudeFaces(faceIndices, distance) {
    const additions = [];
    for (const faceIndex of faceIndices) {
      const face = this.faces[faceIndex];
      if (!face) continue;
      const normal = this._faceNormal(faceIndex);
      const mapping = new Map();
      for (const vertexIndex of face) {
        const original = this.vertices[vertexIndex];
        const clonePosition = original.position.add(normal.scale(distance));
        const clone = { position: clonePosition, normal: normal.clone(), uv: original.uv.slice() };
        mapping.set(vertexIndex, this.vertices.push(clone) - 1);
      }
      const newFace = face.map((index) => mapping.get(index));
      additions.push(newFace);
      const count = face.length;
      for (let i = 0; i < count; i++) {
        const a = face[i];
        const b = face[(i + 1) % count];
        const a2 = mapping.get(a);
        const b2 = mapping.get(b);
        this.faces.push([a, b, b2, a2]);
      }
      this.faces[faceIndex] = newFace;
    }
    this._recalculateNormals();
    return additions;
  }

  insetFaces(faceIndices, amount) {
    for (const faceIndex of faceIndices) {
      const face = this.faces[faceIndex];
      const centroid = this._faceCentroid(faceIndex);
      const normal = this._faceNormal(faceIndex);
      const newIndices = [];
      for (const vertexIndex of face) {
        const vertex = this.vertices[vertexIndex];
        const direction = vertex.position.subtract(centroid);
        const planar = direction.subtract(normal.scale(Vector3.Dot(direction, normal)));
        const target = vertex.position.subtract(planar.normalize().scale(amount));
        const clone = { position: target, normal: vertex.normal.clone(), uv: vertex.uv.slice() };
        newIndices.push(this.vertices.push(clone) - 1);
      }
      const count = face.length;
      for (let i = 0; i < count; i++) {
        const a = face[i];
        const b = face[(i + 1) % count];
        const a2 = newIndices[i];
        const b2 = newIndices[(i + 1) % count];
        this.faces.push([a, b, b2, a2]);
      }
      this.faces[faceIndex] = newIndices;
    }
    this._recalculateNormals();
  }

  bevelEdges(edgeList, width) {
    const uniqueEdges = new Map();
    const affectedFaces = new Set();
    for (const [a, b] of edgeList) {
      const key = edgeKey(a, b);
      uniqueEdges.set(key, [a, b]);
    }
    for (const [a, b] of uniqueEdges.values()) {
      const faces = this._facesForEdge(a, b);
      faces.forEach((index) => affectedFaces.add(index));
    }
    for (const faceIndex of affectedFaces) {
      const face = this.faces[faceIndex];
      const faceEdges = [];
      for (let i = 0; i < face.length; i++) {
        faceEdges.push(edgeKey(face[i], face[(i + 1) % face.length]));
      }
      const newFace = [];
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        const key = edgeKey(a, b);
        const vA = this.vertices[a].position;
        const vB = this.vertices[b].position;
        const direction = vB.subtract(vA);
        const offset = direction.normalize().scale(width);
        let aPrime = a;
        let bPrime = b;
        if (uniqueEdges.has(key)) {
          const newA = { position: vA.add(offset), normal: this.vertices[a].normal.clone(), uv: this.vertices[a].uv.slice() };
          const newB = { position: vB.subtract(offset), normal: this.vertices[b].normal.clone(), uv: this.vertices[b].uv.slice() };
          aPrime = this.vertices.push(newA) - 1;
          bPrime = this.vertices.push(newB) - 1;
          this.faces.push([a, aPrime, bPrime, b]);
        }
        newFace.push(aPrime);
      }
      this.faces[faceIndex] = newFace;
    }
    this._recalculateNormals();
  }

  loopCut(axis = 'x', t = 0.5) {
    const axisIndex = axis === 'y' ? 1 : axis === 'z' ? 2 : 0;
    const newFaces = [];
    for (const face of this.faces) {
      if (face.length < 3) {
        newFaces.push(face.slice());
        continue;
      }
      const high = [];
      const low = [];
      for (let i = 0; i < face.length; i++) {
        const currentIndex = face[i];
        const nextIndex = face[(i + 1) % face.length];
        const currentPos = this.vertices[currentIndex].position;
        const nextPos = this.vertices[nextIndex].position;
        const currentVal = currentPos.getComponent(axisIndex);
        const nextVal = nextPos.getComponent(axisIndex);
        const currentSet = currentVal >= t ? high : low;
        currentSet.push(currentIndex);
        const crosses = (currentVal - t) * (nextVal - t) < 0;
        if (crosses) {
          const delta = nextPos.subtract(currentPos);
          const factor = (t - currentVal) / (delta.getComponent(axisIndex) || EPSILON);
          const newPos = currentPos.add(delta.scale(factor));
          const clone = { position: newPos, normal: this.vertices[currentIndex].normal.clone(), uv: this.vertices[currentIndex].uv.slice() };
          const newIndex = this.vertices.push(clone) - 1;
          high.push(newIndex);
          low.push(newIndex);
        }
      }
      if (high.length >= 3) newFaces.push(high);
      if (low.length >= 3) newFaces.push(low);
    }
    this.faces = newFaces.length ? newFaces : this.faces;
    this._recalculateNormals();
  }

  mergeVertices(vertexIds, { position } = {}) {
    if (!vertexIds.length) return;
    const centroid = position
      ? Vector3.FromArray(position)
      : vertexIds.reduce((acc, id) => acc.addInPlace(this.vertices[id].position), Vector3.Zero()).scale(1 / vertexIds.length);
    for (const id of vertexIds) {
      this.vertices[id].position.copyFrom(centroid);
    }
    this._recalculateNormals();
  }

  mirror(axis = 'x') {
    const axisIndex = axis === 'y' ? 1 : axis === 'z' ? 2 : 0;
    const mirrored = this.clone();
    for (const vertex of mirrored.vertices) {
      const components = [vertex.position.x, vertex.position.y, vertex.position.z];
      components[axisIndex] *= -1;
      vertex.position = new Vector3(components[0], components[1], components[2]);
      vertex.normal = vertex.normal.scale(-1);
    }
    const combined = this.vertices.concat(mirrored.vertices.map((v) => ({ position: v.position, normal: v.normal, uv: v.uv })));
    const offset = this.vertices.length;
    const faces = this.faces.concat(mirrored.faces.map((face) => face.slice().reverse().map((index) => index + offset)));
    this.vertices = combined;
    this.faces = faces;
    this._weld(axisIndex);
    this._recalculateNormals();
  }

  subdivide(iterations = 1) {
    for (let iter = 0; iter < iterations; iter++) {
      const facePoints = this.faces.map((face) => this._faceCentroidVector(face));
      const edgePoints = new Map();
      const vertexFaces = new Map();
      this.faces.forEach((face, faceIndex) => {
        face.forEach((vertexIndex, i) => {
          const next = face[(i + 1) % face.length];
          const key = edgeKey(vertexIndex, next);
          const point = this.vertices[vertexIndex].position
            .add(this.vertices[next].position)
            .add(facePoints[faceIndex])
            .scale(1 / 3);
          edgePoints.set(key, point);
          if (!vertexFaces.has(vertexIndex)) vertexFaces.set(vertexIndex, []);
          vertexFaces.get(vertexIndex).push(faceIndex);
        });
      });
      const newVertices = this.vertices.map((vertex, index) => {
        const faces = vertexFaces.get(index) || [];
        const n = faces.length;
        if (n === 0) return { ...vertex };
        const avgFace = faces.reduce((acc, faceIndex) => acc.addInPlace(facePoints[faceIndex].clone()), Vector3.Zero()).scale(1 / n);
        const avgEdge = this._connectedVertices(index).reduce((acc, vIndex) => acc.addInPlace(this.vertices[vIndex].position.clone()), Vector3.Zero()).scale(1 / this._connectedVertices(index).length);
        const position = avgFace.scale(1 / n).add(avgEdge.scale(2 / n)).add(vertex.position.scale((n - 3) / n));
        return { position, normal: vertex.normal.clone(), uv: vertex.uv.slice() };
      });
      const newFaces = [];
      this.faces.forEach((face, faceIndex) => {
        const fpIndex = newVertices.push({ position: facePoints[faceIndex], normal: facePoints[faceIndex].normalizeToNew(), uv: [0, 0] }) - 1;
        for (let i = 0; i < face.length; i++) {
          const a = face[i];
          const b = face[(i + 1) % face.length];
          const edgeKeyAB = edgeKey(a, b);
          const edgePoint = edgePoints.get(edgeKeyAB);
          const epIndex = newVertices.push({ position: edgePoint, normal: edgePoint.normalizeToNew(), uv: [0, 0] }) - 1;
          const edgePointPrev = edgePoints.get(edgeKey(face[(i - 1 + face.length) % face.length], a));
          const prevIndex = newVertices.push({ position: edgePointPrev, normal: edgePointPrev.normalizeToNew(), uv: [0, 0] }) - 1;
          newFaces.push([a, epIndex, fpIndex, prevIndex]);
        }
      });
      this.vertices = newVertices;
      this.faces = newFaces;
      this._recalculateNormals();
    }
  }

  decimate(targetRatio = 0.5) {
    const targetFaces = Math.max(4, Math.floor(this.faces.length * targetRatio));
    while (this.faces.length > targetFaces) {
      const faceIndex = this._lowestDetailFace();
      if (faceIndex === -1) break;
      const face = this.faces[faceIndex];
      const centroid = this._faceCentroidVector(face);
      const vertexIndex = this.vertices.push({ position: centroid, normal: centroid.normalizeToNew(), uv: [0.5, 0.5] }) - 1;
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        this.faces.push([a, b, vertexIndex]);
      }
      this.faces.splice(faceIndex, 1);
    }
    this._recalculateNormals();
  }

  _faceCentroid(faceIndex) {
    const face = this.faces[faceIndex];
    return this._faceCentroidVector(face).asArray();
  }

  _faceCentroidVector(face) {
    let centroid = Vector3.Zero();
    for (const index of face) {
      centroid = centroid.add(this.vertices[index].position);
    }
    return centroid.scale(1 / face.length);
  }

  _faceNormal(faceIndex) {
    const face = this.faces[faceIndex];
    if (face.length < 3) return new Vector3(0, 1, 0);
    const v0 = this.vertices[face[0]].position;
    const v1 = this.vertices[face[1]].position;
    const v2 = this.vertices[face[2]].position;
    return Vector3.Cross(v1.subtract(v0), v2.subtract(v0)).normalizeToNew();
  }

  _facesForEdge(a, b) {
    const result = [];
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      for (let j = 0; j < face.length; j++) {
        const v0 = face[j];
        const v1 = face[(j + 1) % face.length];
        if ((v0 === a && v1 === b) || (v0 === b && v1 === a)) {
          result.push(i);
        }
      }
    }
    return result;
  }

  _connectedVertices(index) {
    const connected = new Set();
    for (const face of this.faces) {
      const idx = face.indexOf(index);
      if (idx === -1) continue;
      const prev = face[(idx - 1 + face.length) % face.length];
      const next = face[(idx + 1) % face.length];
      connected.add(prev);
      connected.add(next);
    }
    return Array.from(connected);
  }

  _weld(axisIndex) {
    const tolerance = 1e-4;
    const map = new Map();
    const newVertices = [];
    const remap = new Map();
    this.vertices.forEach((vertex, index) => {
      const components = [vertex.position.x, vertex.position.y, vertex.position.z];
      components[axisIndex] = Math.abs(components[axisIndex]);
      const key = components.map((v) => v.toFixed(4)).join(':');
      if (map.has(key)) {
        remap.set(index, map.get(key));
      } else {
        const newIndex = newVertices.push({ position: new Vector3(...components), normal: vertex.normal.clone(), uv: vertex.uv.slice() }) - 1;
        map.set(key, newIndex);
        remap.set(index, newIndex);
      }
    });
    this.faces = this.faces.map((face) => face.map((index) => remap.get(index)));
    this.vertices = newVertices;
  }

  _lowestDetailFace() {
    let minArea = Infinity;
    let minIndex = -1;
    for (let i = 0; i < this.faces.length; i++) {
      const area = this._faceArea(i);
      if (area < minArea) {
        minArea = area;
        minIndex = i;
      }
    }
    return minIndex;
  }

  _faceArea(faceIndex) {
    const face = this.faces[faceIndex];
    if (face.length < 3) return 0;
    let area = 0;
    const origin = this.vertices[face[0]].position;
    for (let i = 1; i < face.length - 1; i++) {
      const a = this.vertices[face[i]].position.subtract(origin);
      const b = this.vertices[face[i + 1]].position.subtract(origin);
      area += Vector3.Cross(a, b).length() * 0.5;
    }
    return area;
  }
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function createBox({ width = 2, height = 2, depth = 2 } = {}) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const vertices = [
    { position: [-hw, -hh, hd], uv: [0, 0] },
    { position: [hw, -hh, hd], uv: [1, 0] },
    { position: [hw, hh, hd], uv: [1, 1] },
    { position: [-hw, hh, hd], uv: [0, 1] },
    { position: [-hw, -hh, -hd], uv: [0, 0] },
    { position: [hw, -hh, -hd], uv: [1, 0] },
    { position: [hw, hh, -hd], uv: [1, 1] },
    { position: [-hw, hh, -hd], uv: [0, 1] }
  ];
  const faces = [
    [0, 1, 2, 3],
    [1, 5, 6, 2],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [3, 2, 6, 7],
    [4, 5, 1, 0]
  ];
  return new EditableMesh({ vertices, faces });
}

function createPlane({ width = 2, height = 2 } = {}) {
  const hw = width / 2;
  const hh = height / 2;
  const vertices = [
    { position: [-hw, 0, -hh], uv: [0, 0] },
    { position: [hw, 0, -hh], uv: [1, 0] },
    { position: [hw, 0, hh], uv: [1, 1] },
    { position: [-hw, 0, hh], uv: [0, 1] }
  ];
  const faces = [[0, 1, 2, 3]];
  return new EditableMesh({ vertices, faces });
}

function createSphere({ radius = 1, segments = 12 } = {}) {
  const vertices = [];
  const faces = [];
  for (let y = 0; y <= segments; y++) {
    const v = y / segments;
    const theta = v * Math.PI;
    for (let x = 0; x <= segments; x++) {
      const u = x / segments;
      const phi = u * Math.PI * 2;
      const sinTheta = Math.sin(theta);
      const position = [
        radius * Math.cos(phi) * sinTheta,
        radius * Math.cos(theta),
        radius * Math.sin(phi) * sinTheta
      ];
      vertices.push({ position, uv: [u, 1 - v] });
    }
  }
  const vertsPerRow = segments + 1;
  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * vertsPerRow + x;
      const b = a + 1;
      const c = a + vertsPerRow + 1;
      const d = a + vertsPerRow;
      faces.push([a, b, c, d]);
    }
  }
  return new EditableMesh({ vertices, faces });
}

function createCylinder({ radius = 1, height = 2, tessellation = 24 } = {}) {
  const halfHeight = height / 2;
  const vertices = [];
  const faces = [];
  for (let i = 0; i < tessellation; i++) {
    const angle = (i / tessellation) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push({ position: [x, -halfHeight, z], uv: [i / tessellation, 1] });
    vertices.push({ position: [x, halfHeight, z], uv: [i / tessellation, 0] });
  }
  for (let i = 0; i < tessellation; i++) {
    const i0 = (i * 2) % (tessellation * 2);
    const i1 = (i0 + 1) % (tessellation * 2);
    const i2 = (i0 + 3) % (tessellation * 2);
    const i3 = (i0 + 2) % (tessellation * 2);
    faces.push([i0, i1, i2, i3]);
  }
  const topCenter = vertices.push({ position: [0, halfHeight, 0], uv: [0.5, 0.5] }) - 1;
  const bottomCenter = vertices.push({ position: [0, -halfHeight, 0], uv: [0.5, 0.5] }) - 1;
  for (let i = 0; i < tessellation; i++) {
    const i0 = (i * 2 + 1) % (tessellation * 2);
    const i1 = ((i + 1) * 2 + 1) % (tessellation * 2);
    faces.push([topCenter, i1, i0]);
  }
  for (let i = 0; i < tessellation; i++) {
    const i0 = (i * 2) % (tessellation * 2);
    const i1 = ((i + 1) * 2) % (tessellation * 2);
    faces.push([bottomCenter, i0, i1]);
  }
  return new EditableMesh({ vertices, faces });
}
