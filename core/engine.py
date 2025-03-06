from core.scene import Scene
from core.commands import CommandManager
from core.settings import Settings
from core.resource_manager import ResourceManager
import numpy as np


class Engine:
    def __init__(self):
        self.scene = Scene()
        self.command_manager = CommandManager()
        self.settings = Settings()
        self.resource_manager = ResourceManager()

    def initialize(self):
        """Initialize the engine with default objects"""
        from core.camera import Camera
        from core.mesh import Mesh

        # Create a default camera
        camera = Camera("Main Camera")
        camera.transform.position = np.array([0, 0, -10])  # Moved farther away
        self.scene.add_object(camera)
        self.scene.active_camera = camera

        # Create a default cube mesh
        cube = Mesh("Cube")
        cube.create_primitive("cube", 1.0)
        self.scene.add_object(cube)

        return cube

    def update(self, dt):
        """Update the scene and all objects"""
        self.scene.update(dt)

    def execute_command(self, command):
        """Execute a command and add to history"""
        self.command_manager.execute(command)

    def undo(self):
        """Undo the last command"""
        self.command_manager.undo()

    def redo(self):
        """Redo the last undone command"""
        self.command_manager.redo()