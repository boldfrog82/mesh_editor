
from core.scene_object import SceneObject

class Scene:
    def __init__(self):
        self.root = SceneObject("Root")
        self.selected_objects = []
        self.active_camera = None
        self.lights = []

    def add_object(self, obj, parent=None):
        """Add an object to the scene"""
        if parent is None:
            parent = self.root
        parent.add_child(obj)
        return obj

    def remove_object(self, obj):
        """Remove an object from the scene"""
        if obj.parent:
            obj.parent.remove_child(obj)

    def update(self, dt):
        """Update all objects in the scene"""
        self.root.update(dt)

    def select_object(self, obj, add_to_selection=False):
        """Select an object in the scene"""
        if not add_to_selection:
            self.clear_selection()

        if obj not in self.selected_objects:
            self.selected_objects.append(obj)
            obj.selected = True

    def clear_selection(self):
        """Clear the current selection"""
        for obj in self.selected_objects:
            obj.selected = False
        self.selected_objects.clear()
