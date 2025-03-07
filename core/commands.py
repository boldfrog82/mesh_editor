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
        """Execute a command and add to history"""
        command.execute()
        self.history.append(command)
        self.future.clear()

    def undo(self):
        """Undo the last command"""
        if self.history:
            command = self.history.pop()
            command.undo()
            self.future.append(command)
            return True
        return False

    def redo(self):
        """Redo the last undone command"""
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


class MoveVerticesCommand(Command):
    """Command to move multiple vertices"""

    def __init__(self, mesh, old_positions, new_positions):
        self.mesh = mesh
        self.old_positions = old_positions  # Dictionary of {vertex_idx: old_pos}
        self.new_positions = new_positions  # Dictionary of {vertex_idx: new_pos}

    def execute(self):
        """Apply the new positions"""
        for idx, pos in self.new_positions.items():
            self.mesh.vertices[idx] = pos.copy()

    def undo(self):
        """Restore the old positions"""
        for idx, pos in self.old_positions.items():
            self.mesh.vertices[idx] = pos.copy()


class ScaleObjectCommand(Command):
    """Command to scale an object"""

    def __init__(self, obj, old_scale, new_scale):
        self.obj = obj
        self.old_scale = old_scale.copy()
        self.new_scale = new_scale.copy()

    def execute(self):
        self.obj.transform.scale = self.new_scale.copy()

    def undo(self):
        self.obj.transform.scale = self.old_scale.copy()


class MoveObjectCommand(Command):
    """Command to move an object"""

    def __init__(self, obj, old_position, new_position):
        self.obj = obj
        self.old_position = old_position.copy()
        self.new_position = new_position.copy()

    def execute(self):
        self.obj.transform.position = self.new_position.copy()

    def undo(self):
        self.obj.transform.position = self.old_position.copy()


class DeleteObjectCommand(Command):
    """Command to delete an object from the scene"""

    def __init__(self, scene, obj):
        self.scene = scene
        self.obj = obj
        self.parent = obj.parent  # Store the parent to restore the hierarchy
        self.children = obj.children.copy()  # Store children to restore the hierarchy

    def execute(self):
        """Remove the object from the scene"""
        # Remove from selection if it's selected
        if self.obj in self.scene.selected_objects:
            self.scene.selected_objects.remove(self.obj)
            self.obj.selected = False

        # Remove the object from the scene
        self.scene.remove_object(self.obj)

    def undo(self):
        """Restore the object to the scene"""
        # Add back to its parent (or the scene root if it was a top-level object)
        if self.parent:
            self.parent.add_child(self.obj)
        else:
            self.scene.add_object(self.obj)

        # Restore its children
        for child in self.children:
            self.obj.add_child(child)

        # If it was selected, re-select it
        if self.obj.selected:
            self.scene.select_object(self.obj, add_to_selection=True)