import { setToast } from '../app/state.js';

export class GLBIO {
  constructor(scene, meshEngine) {
    this.scene = scene;
    this.meshEngine = meshEngine;
  }

  async importFile(file) {
    try {
      await BABYLON.SceneLoader.AppendAsync('', file, this.scene);
      setToast(`Imported ${file.name}`);
    } catch (err) {
      console.error(err);
      setToast('Failed to import GLB');
    }
  }

  async exportProject(project) {
    try {
      const { glTF, binary } = await BABYLON.GLTF2Export.GLBAsync(this.scene, `${project.name || 'project'}.glb`);
      const blob = new Blob([binary], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${project.name || 'project'}.glb`;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast('Exported GLB');
    } catch (err) {
      console.error(err);
      setToast('Export failed');
    }
  }
}
