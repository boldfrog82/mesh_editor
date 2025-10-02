import { EditableMesh } from './editable-mesh.js';

export class HistoryStack {
  constructor(limit = 64) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  snapshot(mesh) {
    const buffer = mesh.serializeBinary();
    this.undoStack.push(buffer);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(current) {
    if (!this.canUndo()) return current;
    this.undoStack.pop();
    this.redoStack.push(current.serializeBinary());
    const previous = this.undoStack[this.undoStack.length - 1];
    return EditableMesh.fromBinary(previous);
  }

  redo(current) {
    if (!this.canRedo()) return current;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    return EditableMesh.fromBinary(next);
  }
}
