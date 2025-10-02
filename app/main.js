import { bootstrap } from './bootstrap.js';
import { subscribe, getState } from './state.js';

(async function run() {
  const { layout, runtime, storage } = await bootstrap();

  subscribe((state) => {
    layout.status.render(state);
    layout.toolbar.setActiveTool(state.activeTool);
    layout.toolbar.setActiveMode(state.activeMode);
    layout.panels.setActive(state.panels.active, state.panels.propertiesTab);
    layout.toast.toggle(state.toast);
    layout.firstRun.toggle(state.showFirstRun);
  });

  layout.toolbar.onToolChange((tool) => {
    runtime.tools.activate(tool);
  });

  layout.toolbar.onModeChange((mode) => {
    runtime.modes.change(mode);
  });

  layout.panels.onPropertiesChange((tab) => {
    runtime.properties.changeTab(tab);
  });

  layout.projects.onCreate(async (name) => {
    const project = await storage.createProject(name);
    if (project) {
      await runtime.projects.load(project);
    }
  });

  layout.projects.onOpen(async (project) => {
    await runtime.projects.load(project);
  });

  layout.projects.onExport(async (project) => {
    await runtime.projects.exportProject(project);
  });

  layout.projects.onDelete(async (project) => {
    await storage.deleteProject(project.id);
  });

  await storage.loadProjects();
  const state = getState();
  if (state.projects.length === 0) {
    layout.firstRun.show();
  }
})();
