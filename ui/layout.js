import { Toolbar } from './toolbar.js';
import { StatusPanel } from './status.js';
import { Panels } from './panels.js';
import { initProjectPicker } from './project-picker.js';
import { initFirstRunOverlay } from './primer.js';
import { setActiveTool } from '../app/state.js';

export function initLayout(root) {
  root.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <strong>Mesh Editor Mobile</strong>
    <span id="backendBadge">Initialising</span>
  `;

  const viewport = document.createElement('section');
  viewport.className = 'viewport';
  const canvas = document.createElement('canvas');
  canvas.id = 'renderCanvas';
  viewport.appendChild(canvas);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  viewport.appendChild(overlay);

  const statusPanel = new StatusPanel();
  overlay.appendChild(statusPanel.element);

  const projectPicker = initProjectPicker();
  overlay.appendChild(projectPicker.element);

  const firstRun = initFirstRunOverlay();
  overlay.appendChild(firstRun.element);

  const panels = new Panels();
  overlay.appendChild(panels.element);

  const toolbar = new Toolbar();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.hidden = true;
  overlay.appendChild(toast);

  shell.appendChild(header);
  shell.appendChild(viewport);
  shell.appendChild(toolbar.element);
  root.appendChild(shell);

  toolbar.onTool((tool) => setActiveTool(tool));

  return {
    canvas,
    toolbar,
    status: statusPanel,
    panels,
    projects: projectPicker,
    firstRun,
    toast: {
      toggle(message) {
        if (!message) {
          toast.hidden = true;
          return;
        }
        toast.hidden = false;
        toast.textContent = message;
      }
    },
    bindRuntime(runtime) {
      statusPanel.setRuntime(runtime);
      panels.bindRuntime(runtime);
      projectPicker.bindRuntime(runtime);
      firstRun.bindRuntime(runtime);
    }
  };
}
