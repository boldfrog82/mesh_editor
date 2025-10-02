export function initApp({ THREE, OrbitControls, OBJLoader }) {
  const viewer = document.getElementById("viewer");
  const fileInput = document.getElementById("file");
  const sampleButton = document.getElementById("sample");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  viewer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111827);

  const camera = new THREE.PerspectiveCamera(60, viewer.clientWidth / viewer.clientHeight, 0.1, 5000);
  camera.position.set(4, 3, 6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(5, 10, 7);
  scene.add(keyLight);

  const group = new THREE.Group();
  scene.add(group);

  const loader = new OBJLoader();

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  const frameToFit = () => {
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2;
    camera.position.copy(center.clone().add(new THREE.Vector3(dist, dist * 0.6, dist)));
    controls.target.copy(center);
    controls.update();
  };

  const clearScene = () => {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
  };

  const loadSceneJSON = (data) => {
    clearScene();
    (data.meshes || []).forEach((meshData) => {
      const positions = meshData.vertices.flat();
      const indices = [];
      (meshData.faces || []).forEach((face) => {
        if (face.length === 3) {
          indices.push(face[0], face[1], face[2]);
        } else if (face.length === 4) {
          indices.push(face[0], face[1], face[2], face[0], face[2], face[3]);
        }
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      if (indices.length) geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 });
      const mesh = new THREE.Mesh(geometry, material);
      const transform = meshData.transform || {};
      const position = transform.position || [0, 0, 0];
      const rotation = transform.rotation || [0, 0, 0];
      const scale = transform.scale || [1, 1, 1];
      mesh.position.fromArray(position);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      mesh.scale.fromArray(scale);
      group.add(mesh);
    });

    frameToFit();
  };

  const loadOBJText = (text) => {
    clearScene();
    const obj = loader.parse(text);
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
        group.add(child);
      }
    });
    frameToFit();
  };

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".obj")) {
      loadOBJText(text);
    } else {
      try {
        const json = JSON.parse(text);
        loadSceneJSON(json);
      } catch (error) {
        console.error("Failed to parse JSON scene", error);
        alert("Could not read the JSON scene. Check the console for details.");
      }
    }
  });

  sampleButton.addEventListener("click", () => {
    loadSceneJSON({
      version: 1,
      meshes: [
        {
          name: "Cube",
          vertices: [
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1],
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1]
          ],
          faces: [
            [0, 1, 2, 3],
            [1, 5, 6, 2],
            [5, 4, 7, 6],
            [4, 0, 3, 7],
            [3, 2, 6, 7],
            [4, 5, 1, 0]
          ],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        }
      ]
    });
  });

  window.addEventListener("resize", resize);
  resize();

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };

  animate();
}
