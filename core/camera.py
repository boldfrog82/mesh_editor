
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
        """Get the view matrix for this camera"""
        # Will implement later
        pass

    def get_projection_matrix(self):
        """Get the projection matrix for this camera"""
        # Will implement later
        pass
