import { markEngineReady, updateStorageUsage, dismissFirstRun, getState } from './state.js';
import { initLayout } from '../ui/layout.js';
import { initRuntime } from '../engine/runtime.js';
import { initStorage } from '../storage/opfs.js';

export async function bootstrap() {
  const appContainer = document.getElementById('app');
  const layout = initLayout(appContainer);
  const runtime = await initRuntime(layout.canvas, {
    onBackendChanged: (backend) => markEngineReady(backend),
    onFrameStats: (stats) => layout.status.update(stats)
  });

  const storage = await initStorage({
    onUsage: (usage) => updateStorageUsage(usage),
    onProjectsChanged: (projects) => layout.projects.refresh(projects, storage)
  });

  layout.projects.bind(storage);
  layout.bindRuntime(runtime);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(console.error);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      storage.refreshUsage();
    }
  });

  layout.firstRun.onDismiss(() => {
    dismissFirstRun();
  });

  if (!getState().showFirstRun) {
    layout.firstRun.hide();
  }

  return { layout, runtime, storage };
}
