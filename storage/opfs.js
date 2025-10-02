const PROJECT_DIR = 'projects';

async function getRootDirectory() {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) {
    throw new Error('OPFS not supported in this browser');
  }
  return navigator.storage.getDirectory();
}

async function ensureDirectory(root, path) {
  let current = root;
  for (const segment of path) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

async function writeFile(dir, name, data) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function readFile(dir, name) {
  try {
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return await file.arrayBuffer();
  } catch (err) {
    return null;
  }
}

export async function listProjects() {
  try {
    const root = await getRootDirectory();
    const projectsDir = await ensureDirectory(root, [PROJECT_DIR]);
    const entries = [];
    for await (const [name, handle] of projectsDir.entries()) {
      if (handle.kind !== 'directory') continue;
      try {
        const metaHandle = await handle.getFileHandle('project.json');
        const file = await metaHandle.getFile();
        const meta = JSON.parse(await file.text());
        entries.push({ id: name, ...meta });
      } catch (err) {
        console.warn('Failed to read project metadata', name, err);
      }
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    console.warn('Unable to list projects', err);
    return [];
  }
}

export async function saveProject(projectId, data) {
  const root = await getRootDirectory();
  const dir = await ensureDirectory(root, [PROJECT_DIR, projectId]);
  const meta = {
    name: data.name,
    updatedAt: new Date().toISOString(),
    preview: data.preview ?? null,
    version: 1
  };
  await writeFile(dir, 'project.json', JSON.stringify(meta));
  if (data.glb) {
    await writeFile(dir, 'mesh.glb', data.glb);
  }
  if (data.project) {
    await writeFile(dir, 'state.json', JSON.stringify(data.project));
  }
  if (data.textures) {
    const texturesDir = await ensureDirectory(dir, ['textures']);
    for (const texture of data.textures) {
      const content = texture.data instanceof Blob ? await texture.data.arrayBuffer() : texture.data;
      await writeFile(texturesDir, texture.name, content);
    }
  }
}

export async function loadProject(projectId) {
  const root = await getRootDirectory();
  const dir = await ensureDirectory(root, [PROJECT_DIR, projectId]);
  const metaBuffer = await readFile(dir, 'project.json');
  if (!metaBuffer) return null;
  const meta = JSON.parse(new TextDecoder().decode(metaBuffer));
  const glb = await readFile(dir, 'mesh.glb');
  const stateBuffer = await readFile(dir, 'state.json');
  const state = stateBuffer ? JSON.parse(new TextDecoder().decode(stateBuffer)) : null;
  const texturesDir = await ensureDirectory(dir, ['textures']);
  const textures = [];
  for await (const [name, handle] of texturesDir.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      textures.push({ name, blob: await file.arrayBuffer() });
    }
  }
  return { id: projectId, meta, glb, state, textures };
}

export async function deleteProject(projectId) {
  const root = await getRootDirectory();
  const dir = await ensureDirectory(root, [PROJECT_DIR]);
  await dir.removeEntry(projectId, { recursive: true });
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

export async function autosave(projectId, payload) {
  await saveProject(projectId, payload);
}
