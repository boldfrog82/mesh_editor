import { setProjects, setCurrentProject } from '../app/state.js';

export function initProjectPicker() {
  const element = document.createElement('div');
  element.className = 'project-picker';
  element.innerHTML = `
    <strong>Projects</strong>
    <div class="project-list"></div>
    <button id="createProject">New Project</button>
  `;

  const list = element.querySelector('.project-list');
  const createButton = element.querySelector('#createProject');

  let runtime = null;
  let storage = null;
  let projects = [];

  function render() {
    list.innerHTML = '';
    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects yet';
      empty.style.opacity = '0.7';
      empty.style.fontSize = '0.8rem';
      list.appendChild(empty);
      return;
    }

    projects.forEach((project) => {
      const button = document.createElement('button');
      button.textContent = project.name;
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.marginTop = '8px';
      button.style.borderRadius = '8px';
      button.style.background = 'rgba(148, 163, 184, 0.12)';
      button.style.border = 'none';
      button.style.padding = '8px 10px';
      button.style.color = 'inherit';
      button.addEventListener('click', () => {
        if (handlers.open) handlers.open(project);
        setCurrentProject(project);
      });

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '6px';
      row.appendChild(button);

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.style.flex = '0 0 auto';
      exportBtn.style.padding = '6px 8px';
      exportBtn.style.background = '#38bdf8';
      exportBtn.style.border = 'none';
      exportBtn.style.borderRadius = '8px';
      exportBtn.style.color = '#04121f';
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (handlers.export) handlers.export(project);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.flex = '0 0 auto';
      deleteBtn.style.padding = '6px 8px';
      deleteBtn.style.background = 'rgba(239, 68, 68, 0.8)';
      deleteBtn.style.border = 'none';
      deleteBtn.style.borderRadius = '8px';
      deleteBtn.style.color = '#04121f';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (handlers.delete) handlers.delete(project);
      });

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '4px';
      controls.appendChild(exportBtn);
      controls.appendChild(deleteBtn);

      row.appendChild(controls);
      list.appendChild(row);
    });
  }

  const handlers = { open: null, create: null, delete: null, export: null };

  createButton.addEventListener('click', async () => {
    const name = prompt('Project name');
    if (!name) return;
    if (handlers.create) await handlers.create(name);
  });

  return {
    element,
    bindRuntime(nextRuntime) {
      runtime = nextRuntime;
    },
    bind(storageInstance) {
      storage = storageInstance;
    },
    refresh(nextProjects, store) {
      projects = nextProjects;
      render();
      setProjects(projects);
    },
    onOpen(cb) {
      handlers.open = cb;
    },
    onCreate(cb) {
      handlers.create = cb;
    },
    onDelete(cb) {
      handlers.delete = cb;
    },
    onExport(cb) {
      handlers.export = cb;
    }
  };
}
