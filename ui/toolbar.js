const TOOLS = [
  'select',
  'move',
  'rotate',
  'scale',
  'add',
  'edit',
  'uv',
  'paint',
  'materials',
  'export'
];

export class Toolbar {
  constructor() {
    this.element = document.createElement('footer');
    this.element.className = 'bottom-toolbar';
    this.toolListeners = new Set();
    this.modeListeners = new Set();
    this.buttons = new Map();

    TOOLS.forEach((tool) => {
      const button = document.createElement('button');
      button.textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
      button.addEventListener('click', () => {
        this.setActiveTool(tool);
        this.toolListeners.forEach((cb) => cb(tool));
        if (tool === 'edit') this.modeListeners.forEach((cb) => cb('edit'));
        if (tool === 'uv') this.modeListeners.forEach((cb) => cb('uv'));
        if (tool === 'paint') this.modeListeners.forEach((cb) => cb('paint'));
        if (tool === 'select' || tool === 'move' || tool === 'rotate' || tool === 'scale' || tool === 'materials' || tool === 'export' || tool === 'add') {
          this.modeListeners.forEach((cb) => cb('object'));
        }
      });
      this.element.appendChild(button);
      this.buttons.set(tool, button);
    });
  }

  onTool(cb) {
    this.toolListeners.add(cb);
    return () => this.toolListeners.delete(cb);
  }

  onToolChange(cb) {
    return this.onTool(cb);
  }

  onModeChange(cb) {
    this.modeListeners.add(cb);
    return () => this.modeListeners.delete(cb);
  }

  setActiveTool(tool) {
    this.buttons.forEach((btn, key) => {
      btn.classList.toggle('active', key === tool);
    });
  }

  setActiveMode(mode) {
    // highlight mode buttons if necessary
    if (mode === 'uv') {
      this.setActiveTool('uv');
    } else if (mode === 'paint') {
      this.setActiveTool('paint');
    }
  }
}
