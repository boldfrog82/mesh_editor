export function createProjectPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'first-run-overlay';
  overlay.style.background = 'rgba(8,10,20,0.92)';
  overlay.style.display = 'none';
  const card = document.createElement('div');
  card.className = 'first-run-card';
  const title = document.createElement('h2');
  title.textContent = 'Projects';
  const list = document.createElement('div');
  list.className = 'project-picker';
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'space-between';
  actions.style.gap = '12px';
  const createBtn = document.createElement('button');
  createBtn.textContent = 'New Project';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.background = 'rgba(30,41,59,0.8)';
  actions.append(createBtn, closeBtn);
  card.append(title, list, actions);
  overlay.append(card);
  document.body.appendChild(overlay);

  let callbacks = { onCreate: () => {}, onOpen: () => {}, onDelete: () => {} };

  createBtn.addEventListener('click', () => {
    callbacks.onCreate?.();
    hide();
  });
  closeBtn.addEventListener('click', hide);

  function show(projects, cb) {
    callbacks = cb;
    list.innerHTML = '';
    projects.forEach((project) => {
      const row = document.createElement('div');
      const openButton = document.createElement('button');
      openButton.textContent = `Open ${project.name}`;
      openButton.addEventListener('click', () => {
        callbacks.onOpen?.(project);
        hide();
      });
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.style.background = 'rgba(239,68,68,0.65)';
      deleteButton.addEventListener('click', () => {
        callbacks.onDelete?.(project);
        hide();
      });
      row.append(openButton, deleteButton);
      row.style.display = 'flex';
      row.style.gap = '8px';
      list.appendChild(row);
    });
    overlay.style.display = 'flex';
  }

  function hide() {
    overlay.style.display = 'none';
  }

  return { show, hide };
}
