
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
        """Add a child object"""
        if child.parent:
            child.parent.remove_child(child)
        child.parent = self
        self.children.append(child)

    def remove_child(self, child):
        """Remove a child object"""
        if child in self.children:
            self.children.remove(child)
            child.parent = None

    def get_world_transform(self):
        """Get the world transformation matrix"""
        if self.parent:
            parent_transform = self.parent.get_world_transform()
            return combine_transforms(parent_transform, self.transform)
        return self.transform

    def update(self, dt):
        """Update this object and all children"""
        for child in self.children:
            child.update(dt)
