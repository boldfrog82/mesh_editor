import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GLTF2Export } from '@babylonjs/serializers/glTF/glTFSerializer';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import { MeshoptCompression } from '@babylonjs/core/Meshes/Compression/meshoptCompression';
import '@babylonjs/loaders/glTF';
import createDracoDecoder from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

const dracoModulePromise = createDracoDecoder();
DracoCompression.Configuration = {
  decoder: {
    wasmBinary: undefined,
    wasmUrl: undefined,
    wasmModulePromise: dracoModulePromise
  }
};

MeshoptCompression.GetDecoderAsync = async () => MeshoptDecoder;

export async function importGLB(arrayBuffer, scene) {
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  try {
    const result = await SceneLoader.ImportMeshAsync('', url, '', scene);
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportGLB(scene, { name = 'project', embedTextures = true } = {}) {
  const exportResult = await GLTF2Export.GLBAsync(scene, name, {
    embedTextures,
    shouldExportTransformNode: () => true,
    shouldExportNode: () => true
  });
  const file = exportResult.glTFFiles[`${name}.glb`];
  return file;
}
