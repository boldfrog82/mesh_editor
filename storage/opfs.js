import { setProjects, setCurrentProject, setToast } from '../app/state.js';

async function estimateUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { used: usage, quota };
  }
  return { used: 0, quota: 0 };
}

async function openRootDirectory() {
  if (navigator.storage && navigator.storage.getDirectory) {
    return navigator.storage.getDirectory();
  }
  return null;
}

async function readProjectMetadata(handle) {
  try {
    const fileHandle = await handle.getFileHandle('project.json');
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text());
  } catch (err) {
    console.warn('Failed to read project metadata', err);
    return null;
  }
}

async function writeProjectMetadata(handle, metadata) {
  const fileHandle = await handle.getFileHandle('project.json', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

export async function initStorage({ onUsage, onProjectsChanged }) {
  const root = await openRootDirectory();
  const fallback = new Map();

  async function listProjects() {
    const projects = [];
    if (root) {
      for await (const entry of root.values()) {
        if (entry.kind === 'directory' && entry.name.startsWith('project-')) {
          const metadata = await readProjectMetadata(entry);
          if (metadata) {
            projects.push({ ...metadata, id: entry.name });
          }
        }
      }
    } else {
      fallback.forEach((value, key) => {
        projects.push({ ...value.metadata, id: key });
      });
    }
    projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setProjects(projects);
    onProjectsChanged(projects);
    return projects;
  }

  async function createProject(name) {
    const id = `project-${Date.now()}`;
    const metadata = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [],
      textures: [],
      thumbnails: []
    };

    if (root) {
      const dir = await root.getDirectoryHandle(id, { create: true });
      await writeProjectMetadata(dir, metadata);
    } else {
      fallback.set(id, { metadata, files: new Map() });
    }
    await listProjects();
    setCurrentProject(metadata);
    setToast(`Created project ${name}`);
    return metadata;
  }

  async function deleteProject(id) {
    if (root) {
      await root.removeEntry(id, { recursive: true });
    } else {
      fallback.delete(id);
    }
    await listProjects();
    setToast('Project deleted');
  }

  async function refreshUsage() {
    const usage = await estimateUsage();
    if (onUsage) onUsage(usage);
  }

  async function saveProjectMetadata(project) {
    if (root) {
      const dir = await root.getDirectoryHandle(project.id, { create: true });
      await writeProjectMetadata(dir, project);
    } else {
      const existing = fallback.get(project.id);
      if (existing) existing.metadata = project;
    }
  }

  async function loadProjects() {
    await listProjects();
    await refreshUsage();
  }

  return {
    root,
    listProjects,
    createProject,
    deleteProject,
    refreshUsage,
    loadProjects,
    saveProjectMetadata
  };
}
