import os

# Project structure
project_structure = {
    "main.py": """
import os
import sys
from core.engine import Engine
from ui.desktop.desktop_app import DesktopApp
from ui.mobile.mobile_app import MobileApp

def main():
    # Initialize the core engine
    engine = Engine()

    # Detect platform and launch appropriate UI
    if is_mobile():
        app = MobileApp(engine)
    else:
        app = DesktopApp(engine)

    app.run()

def is_mobile():
    # Simple platform detection - can be enhanced
    return 'ANDROID_STORAGE' in os.environ

if __name__ == "__main__":
    main()
""",

    "core/__init__.py": "",
    "core/engine.py": """
from core.scene import Scene
from core.commands import CommandManager
from core.settings import Settings
from core.resource_manager import ResourceManager

class Engine:
    def __init__(self):
        self.scene = Scene()
        self.command_manager = CommandManager()
        self.settings = Settings()
        self.resource_manager = ResourceManager()

    def update(self, dt):
        \"\"\"Update the scene and all objects\"\"\"
        self.scene.update(dt)

    def execute_command(self, command):
        \"\"\"Execute a command and add to history\"\"\"
        self.command_manager.execute(command)

    def undo(self):
        \"\"\"Undo the last command\"\"\"
        self.command_manager.undo()

    def redo(self):
        \"\"\"Redo the last undone command\"\"\"
        self.command_manager.redo()
""",

    "core/scene.py": """
from core.scene_object import SceneObject

class Scene:
    def __init__(self):
        self.root = SceneObject("Root")
        self.selected_objects = []
        self.active_camera = None
        self.lights = []

    def add_object(self, obj, parent=None):
        \"\"\"Add an object to the scene\"\"\"
        if parent is None:
            parent = self.root
        parent.add_child(obj)
        return obj

    def remove_object(self, obj):
        \"\"\"Remove an object from the scene\"\"\"
        if obj.parent:
            obj.parent.remove_child(obj)

    def update(self, dt):
        \"\"\"Update all objects in the scene\"\"\"
        self.root.update(dt)

    def select_object(self, obj, add_to_selection=False):
        \"\"\"Select an object in the scene\"\"\"
        if not add_to_selection:
            self.clear_selection()

        if obj not in self.selected_objects:
            self.selected_objects.append(obj)
            obj.selected = True

    def clear_selection(self):
        \"\"\"Clear the current selection\"\"\"
        for obj in self.selected_objects:
            obj.selected = False
        self.selected_objects.clear()
""",

    "core/scene_object.py": """
import numpy as np
from core.transform import Transform, combine_transforms

class SceneObject:
    def __init__(self, name="Object"):
        self.name = name
        self.parent = None
        self.children = []
        self.visible = True
        self.selected = False
        self.transform = Transform()

    def add_child(self, child):
        \"\"\"Add a child object\"\"\"
        if child.parent:
            child.parent.remove_child(child)
        child.parent = self
        self.children.append(child)

    def remove_child(self, child):
        \"\"\"Remove a child object\"\"\"
        if child in self.children:
            self.children.remove(child)
            child.parent = None

    def get_world_transform(self):
        \"\"\"Get the world transformation matrix\"\"\"
        if self.parent:
            parent_transform = self.parent.get_world_transform()
            return combine_transforms(parent_transform, self.transform)
        return self.transform

    def update(self, dt):
        \"\"\"Update this object and all children\"\"\"
        for child in self.children:
            child.update(dt)
""",

    "core/transform.py": """
import numpy as np
import math

class Transform:
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0])
        self.rotation = np.array([0.0, 0.0, 0.0])  # Euler angles
        self.scale = np.array([1.0, 1.0, 1.0])

    def get_matrix(self):
        \"\"\"Get the transformation matrix\"\"\"
        # Create translation matrix
        trans_mat = np.identity(4)
        trans_mat[0:3, 3] = self.position

        # Create rotation matrices for X, Y, Z
        rot_x = np.identity(4)
        rot_y = np.identity(4)
        rot_z = np.identity(4)

        cx, sx = math.cos(self.rotation[0]), math.sin(self.rotation[0])
        cy, sy = math.cos(self.rotation[1]), math.sin(self.rotation[1])
        cz, sz = math.cos(self.rotation[2]), math.sin(self.rotation[2])

        rot_x[1:3, 1:3] = np.array([[cx, -sx], [sx, cx]])
        rot_y[0:3:2, 0:3:2] = np.array([[cy, -sy], [sy, cy]])
        rot_z[0:2, 0:2] = np.array([[cz, -sz], [sz, cz]])

        # Create scale matrix
        scale_mat = np.identity(4)
        np.fill_diagonal(scale_mat[0:3, 0:3], self.scale)

        # Combine matrices: T * R * S
        return trans_mat @ rot_z @ rot_y @ rot_x @ scale_mat

def combine_transforms(t1, t2):
    \"\"\"Combine two transforms\"\"\"
    result = Transform()
    result.position = t1.position + t2.position
    result.rotation = t1.rotation + t2.rotation
    result.scale = t1.scale * t2.scale
    return result
""",

    "core/mesh.py": """
import numpy as np
from core.scene_object import SceneObject

class Mesh(SceneObject):
    def __init__(self, name="Mesh"):
        super().__init__(name)
        self.vertices = np.array([], dtype=float)
        self.faces = []
        self.edges = []
        self.materials = []
        self.uvs = []
        self.normals = []
        self.colors = []

    def calculate_normals(self):
        \"\"\"Calculate face and vertex normals\"\"\"
        # Will implement later
        pass

    def create_primitive(self, primitive_type, size=1.0):
        \"\"\"Create a primitive shape\"\"\"
        if primitive_type == "cube":
            self._create_cube(size)
        elif primitive_type == "sphere":
            self._create_sphere(size)
        # Additional primitives...

    def _create_cube(self, size):
        \"\"\"Create a cube mesh\"\"\"
        half = size / 2
        self.vertices = np.array([
            [-half, -half, -half],  # 0: back bottom left
            [half, -half, -half],   # 1: back bottom right
            [half, half, -half],    # 2: back top right
            [-half, half, -half],   # 3: back top left
            [-half, -half, half],   # 4: front bottom left
            [half, -half, half],    # 5: front bottom right
            [half, half, half],     # 6: front top right
            [-half, half, half]     # 7: front top left
        ], dtype=float)

        self.faces = [
            (0, 1, 2, 3),  # back
            (4, 5, 6, 7),  # front
            (0, 1, 5, 4),  # bottom
            (2, 3, 7, 6),  # top
            (0, 3, 7, 4),  # left
            (1, 2, 6, 5)   # right
        ]

        self.edges = [
            (0, 1), (1, 2), (2, 3), (3, 0),  # back face
            (4, 5), (5, 6), (6, 7), (7, 4),  # front face
            (0, 4), (1, 5), (2, 6), (3, 7)   # connecting edges
        ]

    def _create_sphere(self, size, segments=16, rings=8):
        \"\"\"Create a sphere mesh\"\"\"
        # Will implement later
        pass
""",

    "core/commands.py": """
class Command:
    def execute(self):
        pass

    def undo(self):
        pass

class CommandManager:
    def __init__(self):
        self.history = []
        self.future = []

    def execute(self, command):
        \"\"\"Execute a command and add to history\"\"\"
        command.execute()
        self.history.append(command)
        self.future.clear()

    def undo(self):
        \"\"\"Undo the last command\"\"\"
        if self.history:
            command = self.history.pop()
            command.undo()
            self.future.append(command)
            return True
        return False

    def redo(self):
        \"\"\"Redo the last undone command\"\"\"
        if self.future:
            command = self.future.pop()
            command.execute()
            self.history.append(command)
            return True
        return False

class MoveVertexCommand(Command):
    def __init__(self, mesh, vertex_idx, old_pos, new_pos):
        self.mesh = mesh
        self.vertex_idx = vertex_idx
        self.old_pos = old_pos.copy()
        self.new_pos = new_pos.copy()

    def execute(self):
        self.mesh.vertices[self.vertex_idx] = self.new_pos

    def undo(self):
        self.mesh.vertices[self.vertex_idx] = self.old_pos
""",

    "core/mesh_operations.py": """
import numpy as np

def extrude_face(mesh, face_idx, amount):
    \"\"\"Extrude a face by a given amount\"\"\"
    # Will implement later
    pass

def bevel_edge(mesh, edge_idx, amount):
    \"\"\"Bevel an edge by a given amount\"\"\"
    # Will implement later
    pass

def subdivide(mesh, level=1):
    \"\"\"Subdivide a mesh to increase detail\"\"\"
    # Will implement later
    pass
""",

    "core/camera.py": """
import numpy as np
from core.scene_object import SceneObject

class Camera(SceneObject):
    def __init__(self, name="Camera"):
        super().__init__(name)
        self.fov = 60.0  # Field of view in degrees
        self.near = 0.1  # Near clipping plane
        self.far = 1000.0  # Far clipping plane
        self.aspect_ratio = 4/3  # Width/height

    def get_view_matrix(self):
        \"\"\"Get the view matrix for this camera\"\"\"
        # Will implement later
        pass

    def get_projection_matrix(self):
        \"\"\"Get the projection matrix for this camera\"\"\"
        # Will implement later
        pass
""",

    "core/renderer.py": """
class Renderer:
    def __init__(self, scene):
        self.scene = scene

    def render(self, camera):
        \"\"\"Render the scene from a camera view\"\"\"
        # Will implement in platform-specific renderers
        pass
""",

    "core/settings.py": """
class Settings:
    def __init__(self):
        self.render_settings = {
            "wireframe": False,
            "show_normals": False,
            "show_grid": True,
            "backface_culling": True,
        }

        self.editor_settings = {
            "autosave": True,
            "autosave_interval": 300,  # seconds
            "grid_size": 1.0,
            "snap_to_grid": False,
        }

        self.ui_settings = {
            "theme": "dark",
            "font_size": 14,
        }

    def load(self, filename):
        \"\"\"Load settings from file\"\"\"
        # Will implement later
        pass

    def save(self, filename):
        \"\"\"Save settings to file\"\"\"
        # Will implement later
        pass
""",

    "core/resource_manager.py": """
class ResourceManager:
    def __init__(self):
        self.resources = {}

    def load_resource(self, resource_type, path):
        \"\"\"Load a resource from disk\"\"\"
        # Will implement later
        pass

    def get_resource(self, resource_id):
        \"\"\"Get a loaded resource\"\"\"
        return self.resources.get(resource_id)

    def unload_resource(self, resource_id):
        \"\"\"Unload a resource to free memory\"\"\"
        if resource_id in self.resources:
            del self.resources[resource_id]
""",

    "core/io/__init__.py": "",
    "core/io/mesh_io.py": """
import numpy as np
import json

class MeshIO:
    @staticmethod
    def import_obj(filename):
        \"\"\"Import a mesh from an OBJ file\"\"\"
        # Will implement later
        pass

    @staticmethod
    def export_obj(mesh, filename):
        \"\"\"Export a mesh to an OBJ file\"\"\"
        # Will implement later
        pass

    @staticmethod
    def import_stl(filename):
        \"\"\"Import a mesh from an STL file\"\"\"
        # Will implement later
        pass

    @staticmethod
    def export_stl(mesh, filename):
        \"\"\"Export a mesh to an STL file\"\"\"
        # Will implement later
        pass
""",

    "ui/__init__.py": "",
    "ui/desktop/__init__.py": "",
    "ui/desktop/desktop_app.py": """
import pygame
import sys
from ui.desktop.desktop_renderer import DesktopRenderer
from ui.desktop.desktop_ui_manager import DesktopUIManager
from ui.desktop.desktop_input_handler import DesktopInputHandler

class DesktopApp:
    def __init__(self, engine):
        self.engine = engine
        self.width = 800
        self.height = 600
        self.screen = None
        self.clock = None
        self.ui_manager = DesktopUIManager()
        self.input_handler = DesktopInputHandler()
        self.renderer = DesktopRenderer(engine.scene)

    def init(self):
        \"\"\"Initialize pygame and set up the window\"\"\"
        pygame.init()
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("3D Mesh Editor")
        self.clock = pygame.time.Clock()

    def run(self):
        \"\"\"Main application loop\"\"\"
        self.init()

        running = True
        while running:
            dt = self.clock.tick(60) / 1000.0

            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False

                self.input_handler.handle_event(event, self.engine)
                self.ui_manager.handle_event(event)

            # Update
            self.engine.update(dt)
            self.ui_manager.update(dt)

            # Render
            self.screen.fill((0, 0, 0))
            self.renderer.render(self.engine.scene.active_camera)
            self.ui_manager.draw(self.screen)
            pygame.display.flip()

        pygame.quit()
""",

    "ui/desktop/desktop_renderer.py": """
import pygame
import numpy as np

class DesktopRenderer:
    def __init__(self, scene):
        self.scene = scene

    def render(self, camera):
        \"\"\"Render the scene using Pygame\"\"\"
        # Will implement later
        pass
""",

    "ui/desktop/desktop_ui_manager.py": """
import pygame

class DesktopUIManager:
    def __init__(self):
        self.widgets = []

    def add_widget(self, widget):
        \"\"\"Add a UI widget\"\"\"
        self.widgets.append(widget)

    def handle_event(self, event):
        \"\"\"Handle UI events\"\"\"
        for widget in self.widgets:
            widget.handle_event(event)

    def update(self, dt):
        \"\"\"Update all widgets\"\"\"
        for widget in self.widgets:
            widget.update(dt)

    def draw(self, surface):
        \"\"\"Draw all widgets\"\"\"
        for widget in self.widgets:
            widget.draw(surface)
""",

    "ui/desktop/desktop_input_handler.py": """
import pygame

class DesktopInputHandler:
    def __init__(self):
        self.mouse_position = (0, 0)
        self.mouse_buttons = [False, False, False]  # Left, Middle, Right
        self.modifiers = {"ctrl": False, "shift": False, "alt": False}
        self.dragging = False
        self.drag_start = (0, 0)

    def handle_event(self, event, engine):
        \"\"\"Handle input events\"\"\"
        if event.type == pygame.MOUSEMOTION:
            self.mouse_position = event.pos
            if self.dragging:
                self._handle_drag(engine)

        elif event.type == pygame.MOUSEBUTTONDOWN:
            self.mouse_buttons[event.button-1] = True
            self.drag_start = event.pos
            self.dragging = True
            self._handle_click(engine, event.button)

        elif event.type == pygame.MOUSEBUTTONUP:
            self.mouse_buttons[event.button-1] = False
            self.dragging = False

        elif event.type == pygame.KEYDOWN:
            self._update_modifiers(event.key, True)
            self._handle_keydown(engine, event.key)

        elif event.type == pygame.KEYUP:
            self._update_modifiers(event.key, False)

    def _update_modifiers(self, key, pressed):
        \"\"\"Update modifier key states\"\"\"
        if key in (pygame.K_LCTRL, pygame.K_RCTRL):
            self.modifiers["ctrl"] = pressed
        elif key in (pygame.K_LSHIFT, pygame.K_RSHIFT):
            self.modifiers["shift"] = pressed
        elif key in (pygame.K_LALT, pygame.K_RALT):
            self.modifiers["alt"] = pressed

    def _handle_click(self, engine, button):
        \"\"\"Handle mouse click\"\"\"
        # Will implement later
        pass

    def _handle_drag(self, engine):
        \"\"\"Handle mouse drag\"\"\"
        # Will implement later
        pass

    def _handle_keydown(self, engine, key):
        \"\"\"Handle key press\"\"\"
        # Will implement later
        pass
""",

    "ui/mobile/__init__.py": "",
    "ui/mobile/mobile_app.py": """
class MobileApp:
    def __init__(self, engine):
        self.engine = engine

    def run(self):
        \"\"\"Start the mobile application\"\"\"
        print("Mobile app not implemented yet")
""",

    "ui/mobile/mobile_renderer.py": """
class MobileRenderer:
    def __init__(self, scene):
        self.scene = scene

    def render(self, camera):
        \"\"\"Render the scene for mobile\"\"\"
        # Will implement later
        pass
""",

    "ui/mobile/mobile_ui_manager.py": """
class MobileUIManager:
    def __init__(self):
        self.widgets = []

    def add_widget(self, widget):
        \"\"\"Add a UI widget\"\"\"
        self.widgets.append(widget)

    def update(self, dt):
        \"\"\"Update all widgets\"\"\"
        for widget in self.widgets:
            widget.update(dt)
""",

    "ui/mobile/mobile_input_handler.py": """
class MobileInputHandler:
    def __init__(self):
        self.touch_positions = {}  # Dictionary of active touches
        self.gestures = []  # List of recognized gestures

    def handle_touch_down(self, touch_id, position):
        \"\"\"Handle touch down event\"\"\"
        self.touch_positions[touch_id] = position
        self._update_gestures()

    def handle_touch_move(self, touch_id, position):
        \"\"\"Handle touch move event\"\"\"
        if touch_id in self.touch_positions:
            self.touch_positions[touch_id] = position
            self._update_gestures()

    def handle_touch_up(self, touch_id):
        \"\"\"Handle touch up event\"\"\"
        if touch_id in self.touch_positions:
            del self.touch_positions[touch_id]
            self._update_gestures()

    def _update_gestures(self):
        \"\"\"Update recognized gestures based on touch state\"\"\"
        # Will implement later
        pass
""",

    "assets/textures/.gitkeep": "",
    "assets/models/.gitkeep": "",
    "assets/shaders/.gitkeep": "",
}


def create_directory_structure(base_path):
    """Create the directory structure for the project"""
    for path, content in project_structure.items():
        # Create the full path
        full_path = os.path.join(base_path, path)

        # Create directory if it doesn't exist
        directory = os.path.dirname(full_path)
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Write the file
        with open(full_path, 'w') as f:
            f.write(content)

        print(f"Created: {path}")


if __name__ == "__main__":
    # Create the project in the current directory
    create_directory_structure(".")
    print("\nProject structure created successfully!")