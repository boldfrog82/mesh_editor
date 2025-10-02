import os
import socket
from datetime import datetime
from typing import Dict, List, Optional, Union

import numpy as np


class MobileApp:
    """Serve a lightweight web viewer that works on mobile devices."""

    def __init__(self, engine, host: Optional[str] = None, port: Optional[int] = None):
        self.engine = engine
        self.host = host or os.environ.get("MESH_EDITOR_MOBILE_HOST", "0.0.0.0")
        self.port = int(port or os.environ.get("MESH_EDITOR_MOBILE_PORT", 5000))

        try:
            from flask import Flask, jsonify, render_template
        except ImportError as exc:  # pragma: no cover - depends on runtime env
            raise RuntimeError(
                "The mobile viewer requires Flask. Install it with 'pip install flask'."
            ) from exc

        base_dir = os.path.dirname(os.path.abspath(__file__))
        template_dir = os.path.join(base_dir, "templates")
        static_dir = os.path.join(base_dir, "static")

        self._jsonify = jsonify
        self._render_template = render_template
        self._app = Flask(
            __name__,
            template_folder=template_dir,
            static_folder=static_dir,
            static_url_path="/static",
        )
        self._register_routes()

    def run(self) -> None:
        """Start the Flask development server."""
        local_ip = self._guess_local_ip() if self.host in {"0.0.0.0", "::"} else self.host
        print("\nMobile viewer ready!\n")
        print(f"Local server: http://{self.host}:{self.port}")
        if local_ip and local_ip != self.host:
            print("Ensure your phone is on the same network, then open:")
            print(f"  http://{local_ip}:{self.port}")
        print("Press CTRL+C to stop the server.\n")

        self._app.run(host=self.host, port=self.port, debug=False, use_reloader=False)

    # ------------------------------------------------------------------
    # Flask routes
    # ------------------------------------------------------------------
    def _register_routes(self) -> None:
        @self._app.route("/")
        def index():
            return self._render_template(
                "index.html",
                scene_name=self.engine.scene.root.name,
                now=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ"),
            )

        @self._app.route("/api/scene")
        def api_scene():
            return self._jsonify(self._build_scene_payload())

    # ------------------------------------------------------------------
    # Scene serialization helpers
    # ------------------------------------------------------------------
    def _build_scene_payload(self) -> Dict[str, object]:
        from core.mesh import Mesh

        meshes: List[Dict[str, object]] = []
        for obj in self.engine.scene.root.children:
            if isinstance(obj, Mesh):
                meshes.append(
                    {
                        "name": obj.name,
                        "vertices": obj.vertices.astype(float).tolist(),
                        "faces": [list(face) for face in obj.faces],
                        "transform": {
                            "position": obj.transform.position.astype(float).tolist(),
                            "rotation": obj.transform.rotation.astype(float).tolist(),
                            "scale": obj.transform.scale.astype(float).tolist(),
                        },
                    }
                )

        camera = self.engine.scene.active_camera
        camera_payload = None
        if camera is not None:
            camera_payload = {
                "name": getattr(camera, "name", "Camera"),
                "transform": {
                    "position": self._to_list(camera.transform.position),
                    "rotation": self._to_list(camera.transform.rotation),
                },
            }

        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "meshes": meshes,
            "camera": camera_payload,
        }

    @staticmethod
    def _to_list(value: Union[np.ndarray, List[float]]) -> List[float]:
        if isinstance(value, np.ndarray):
            return value.astype(float).tolist()
        return list(value)

    @staticmethod
    def _guess_local_ip() -> str:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.connect(("8.8.8.8", 80))
                return sock.getsockname()[0]
        except OSError:
            return "localhost"
