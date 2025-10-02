import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EditableMesh } from '../modeling/editable-mesh.js';

export class UVEngine {
  constructor(modeling) {
    this.modeling = modeling;
    this.seams = new Set();
  }

  toggleSeam(edge) {
    const key = edgeKey(edge[0], edge[1]);
    if (this.seams.has(key)) this.seams.delete(key);
    else this.seams.add(key);
  }

  clearSeams() {
    this.seams.clear();
  }

  autoUnwrap() {
    if (!this.modeling.editable) return;
    const mesh = this.modeling.editable;
    for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex++) {
      const face = mesh.faces[faceIndex];
      const normal = mesh._faceNormal(faceIndex);
      const axis = dominantAxis(normal);
      const basis = projectionBasis(axis);
      for (const index of face) {
        const position = mesh.vertices[index].position;
        const u = Vector3.Dot(position, basis.u) * 0.5 + 0.5;
        const v = Vector3.Dot(position, basis.v) * 0.5 + 0.5;
        mesh.vertices[index].uv = [u, v];
      }
    }
    this.packIslands();
    this.modeling.applyToScene();
  }

  packIslands() {
    if (!this.modeling.editable) return;
    const mesh = this.modeling.editable;
    const bounds = mesh.faces.map((face) => {
      let minU = Infinity;
      let minV = Infinity;
      let maxU = -Infinity;
      let maxV = -Infinity;
      for (const index of face) {
        const [u, v] = mesh.vertices[index].uv;
        minU = Math.min(minU, u);
        minV = Math.min(minV, v);
        maxU = Math.max(maxU, u);
        maxV = Math.max(maxV, v);
      }
      return { minU, minV, maxU, maxV, face };
    });
    bounds.sort((a, b) => (b.maxU - b.minU) * (b.maxV - b.minV) - (a.maxU - a.minU) * (a.maxV - a.minV));
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    const padding = 0.02;
    for (const island of bounds) {
      const width = island.maxU - island.minU;
      const height = island.maxV - island.minV;
      if (cursorX + width + padding > 1) {
        cursorX = 0;
        cursorY += rowHeight + padding;
        rowHeight = 0;
      }
      for (const index of island.face) {
        const uv = mesh.vertices[index].uv;
        mesh.vertices[index].uv = [cursorX + (uv[0] - island.minU), cursorY + (uv[1] - island.minV)];
      }
      cursorX += width + padding;
      rowHeight = Math.max(rowHeight, height);
    }
    const totalHeight = cursorY + rowHeight;
    if (totalHeight > 1) {
      const scale = 1 / totalHeight;
      for (const vertex of mesh.vertices) {
        vertex.uv = [vertex.uv[0] * scale, vertex.uv[1] * scale];
      }
    }
    this.modeling.applyToScene();
  }

  exportLayout(size = 2048) {
    if (!this.modeling.editable) return null;
    const mesh = this.modeling.editable;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (const face of mesh.faces) {
      ctx.beginPath();
      face.forEach((index, idx) => {
        const [u, v] = mesh.vertices[index].uv;
        const x = u * size;
        const y = (1 - v) * size;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    return canvas;
  }
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function dominantAxis(normal) {
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  if (absX >= absY && absX >= absZ) return 'x';
  if (absY >= absX && absY >= absZ) return 'y';
  return 'z';
}

function projectionBasis(axis) {
  switch (axis) {
    case 'x':
      return { u: new Vector3(0, 0, 1), v: new Vector3(0, 1, 0) };
    case 'y':
      return { u: new Vector3(1, 0, 0), v: new Vector3(0, 0, 1) };
    default:
      return { u: new Vector3(1, 0, 0), v: new Vector3(0, 1, 0) };
  }
}
