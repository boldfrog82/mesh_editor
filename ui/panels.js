import { setPanelActive, setPropertiesTab } from '../app/state.js';

export class Panels {
  constructor() {
    this.element = document.createElement('aside');
    this.element.className = 'panels';

    const tabs = document.createElement('div');
    tabs.className = 'panel-tabs';
    const outlinerBtn = document.createElement('button');
    outlinerBtn.textContent = 'Outliner';
    outlinerBtn.classList.add('active');
    const propertiesBtn = document.createElement('button');
    propertiesBtn.textContent = 'Properties';

    tabs.appendChild(outlinerBtn);
    tabs.appendChild(propertiesBtn);
    this.element.appendChild(tabs);

    this.content = document.createElement('div');
    this.content.className = 'panel-content';
    this.element.appendChild(this.content);

    outlinerBtn.addEventListener('click', () => {
      outlinerBtn.classList.add('active');
      propertiesBtn.classList.remove('active');
      setPanelActive('outliner');
      this.renderOutliner();
    });

    propertiesBtn.addEventListener('click', () => {
      propertiesBtn.classList.add('active');
      outlinerBtn.classList.remove('active');
      setPanelActive('properties');
      this.renderProperties('object');
    });

    this.outlinerBtn = outlinerBtn;
    this.propertiesBtn = propertiesBtn;
    this.runtime = null;
    this.currentTab = 'object';
    this.renderOutliner();
  }

  bindRuntime(runtime) {
    this.runtime = runtime;
    this.renderOutliner();
  }

  setActive(panel, propertiesTab) {
    if (panel === 'outliner') {
      this.outlinerBtn.classList.add('active');
      this.propertiesBtn.classList.remove('active');
      this.renderOutliner();
    } else {
      this.propertiesBtn.classList.add('active');
      this.outlinerBtn.classList.remove('active');
      this.renderProperties(propertiesTab || this.currentTab);
    }
  }

  onPropertiesChange(cb) {
    this.onPropertiesChangeCb = cb;
  }

  renderOutliner() {
    this.content.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = 'Scene';
    this.content.appendChild(title);

    if (!this.runtime) return;

    const list = document.createElement('div');
    this.runtime.scene.meshes
      .filter((mesh) => mesh.metadata?.isEditable)
      .forEach((mesh) => {
        const button = document.createElement('button');
        button.textContent = mesh.name;
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.padding = '8px 10px';
        button.style.marginBottom = '6px';
        button.style.borderRadius = '8px';
        button.style.background = 'rgba(148, 163, 184, 0.12)';
        button.style.border = 'none';
        button.style.color = 'inherit';
        button.addEventListener('click', () => {
          this.runtime.selection.selectMesh(mesh);
        });
        list.appendChild(button);
      });

    this.content.appendChild(list);
  }

  renderProperties(tab) {
    this.currentTab = tab;
    this.content.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'panel-tabs';
    const tabNames = [
      { id: 'object', label: 'Object' },
      { id: 'modifiers', label: 'Modifiers' },
      { id: 'material', label: 'Material' },
      { id: 'uv', label: 'UV' },
      { id: 'texture', label: 'Texture' }
    ];

    tabNames.forEach(({ id, label }) => {
      const button = document.createElement('button');
      button.textContent = label;
      if (id === tab) button.classList.add('active');
      button.addEventListener('click', () => {
        setPropertiesTab(id);
        this.renderProperties(id);
        if (this.onPropertiesChangeCb) this.onPropertiesChangeCb(id);
      });
      tabs.appendChild(button);
    });

    this.content.appendChild(tabs);

    const section = document.createElement('div');
    section.className = 'panel-section';
    section.innerHTML = `<p>Controls for ${tab} will appear here.</p>`;
    this.content.appendChild(section);
  }
}
