import pygame
import numpy as np
from core.commands import MoveVerticesCommand


class DesktopInputHandler:
    def __init__(self):
        self.mouse_position = (0, 0)
        self.mouse_buttons = [False, False, False]  # Left, Middle, Right
        self.modifiers = {"ctrl": False, "shift": False, "alt": False}
        self.dragging = False
        self.drag_start = (0, 0)

        # Selection state
        self.selection_mode = "object"  # "object", "vertex", "edge", "face"
        self.selected_vertices = set()
        self.selected_edges = set()
        self.selected_faces = set()
        self.selection_radius = 10  # Pixels

        # Active mesh
        self.active_mesh = None

        # Separate rotation matrices for object and view
        self.view_rotation = np.identity(3)  # View/camera rotation

    def handle_event(self, event, engine):
        """Handle input events"""
        if event.type == pygame.MOUSEMOTION:
            self.mouse_position = event.pos
            if self.dragging:
                if self.modifiers["alt"] and self.selection_mode == "vertex" and self.selected_vertices:
                    # Manipulate vertices when Alt is pressed
                    self._handle_vertex_manipulation(engine)
                else:
                    # Normal camera movement
                    self._handle_drag(engine)

        elif event.type == pygame.MOUSEBUTTONDOWN:
            button_idx = event.button - 1
            if 0 <= button_idx < len(self.mouse_buttons):
                self.mouse_buttons[button_idx] = True
            self.drag_start = event.pos
            self.dragging = True

            # Handle selecting elements based on selection mode
            if button_idx == 0 and not self.modifiers["alt"]:  # Left click without Alt
                self._handle_selection(engine)
            else:
                self._handle_click(engine, event.button)

        elif event.type == pygame.MOUSEBUTTONUP:
            button_idx = event.button - 1
            if 0 <= button_idx < len(self.mouse_buttons):
                self.mouse_buttons[button_idx] = False
            self.dragging = False

        elif event.type == pygame.MOUSEWHEEL:
            # Handle mouse wheel scrolling for zoom
            zoom_amount = event.y * 0.1  # Y is the vertical scroll amount
            self._handle_zoom(engine, zoom_amount)

        elif event.type == pygame.KEYDOWN:
            self._update_modifiers(event.key, True)
            self._handle_keydown(engine, event.key)

        elif event.type == pygame.KEYUP:
            self._update_modifiers(event.key, False)

    def _update_modifiers(self, key, pressed):
        """Update modifier key states"""
        if key in (pygame.K_LCTRL, pygame.K_RCTRL):
            self.modifiers["ctrl"] = pressed
        elif key in (pygame.K_LSHIFT, pygame.K_RSHIFT):
            self.modifiers["shift"] = pressed
        elif key in (pygame.K_LALT, pygame.K_RALT):
            self.modifiers["alt"] = pressed

    def _handle_selection(self, engine):
        """Handle selection based on current mode"""
        if self.selection_mode == "vertex":
            self._select_vertex(engine)
        elif self.selection_mode == "edge":
            self._select_edge(engine)
        elif self.selection_mode == "face":
            self._select_face(engine)
        else:  # Object mode
            self._select_object(engine)

    def _select_vertex(self, engine):
        """Select a vertex under the mouse cursor"""
        # Get renderer
        renderer = self._get_renderer(engine)
        if not renderer:
            return

        # Find the active mesh
        if not self.active_mesh:
            for obj in engine.scene.root.children:
                if hasattr(obj, 'vertices') and len(obj.vertices) > 0:
                    self.active_mesh = obj
                    break

        if not self.active_mesh:
            return

        # Get projected vertex positions
        vertices = self.active_mesh.vertices.copy()
        renderer._rotate_vertices(vertices)

        # Find the closest vertex to mouse position
        closest_idx = -1
        closest_dist = float('inf')

        for i, v in enumerate(vertices):
            # Project the vertex to screen space
            z_depth = v[2] + 5
            if z_depth <= 0.1:  # Avoid division by zero
                z_depth = 0.1
            factor = 200 / z_depth
            x = v[0] * renderer.scale * factor + renderer.translate[0]
            y = v[1] * renderer.scale * factor + renderer.translate[1]

            # Calculate distance to mouse
            dx = x - self.mouse_position[0]
            dy = y - self.mouse_position[1]
            dist = (dx * dx + dy * dy) ** 0.5

            if dist < self.selection_radius and dist < closest_dist:
                closest_dist = dist
                closest_idx = i

        # Handle the selection
        if closest_idx >= 0:
            if not self.modifiers["shift"]:
                # Clear selection if shift is not held
                self.selected_vertices.clear()

            # Toggle the vertex selection
            if closest_idx in self.selected_vertices:
                self.selected_vertices.remove(closest_idx)
            else:
                self.selected_vertices.add(closest_idx)

            print(f"Selected vertices: {self.selected_vertices}")

    def _select_edge(self, engine):
        """Select an edge under the mouse cursor"""
        # Placeholder - will implement later
        pass

    def _select_face(self, engine):
        """Select a face under the mouse cursor"""
        # Placeholder - will implement later
        pass

    def _select_object(self, engine):
        """Select an object under the mouse cursor"""
        # Placeholder - will implement later
        pass

    def _handle_vertex_manipulation(self, engine):
        """Manipulate selected vertices"""
        if not self.active_mesh or not self.selected_vertices:
            return

        # Get renderer
        renderer = self._get_renderer(engine)
        if not renderer:
            return

        # Calculate movement in screen space
        dx = self.mouse_position[0] - self.drag_start[0]
        dy = self.mouse_position[1] - self.drag_start[1]

        # Update drag start
        self.drag_start = self.mouse_position

        # Scale movement based on view scale
        world_dx = dx / renderer.scale
        world_dy = dy / renderer.scale

        # Create a command to move vertices
        old_positions = {idx: self.active_mesh.vertices[idx].copy() for idx in self.selected_vertices}

        # Determine movement direction based on view orientation
        # This is simplified and would need to be improved based on view rotation
        for idx in self.selected_vertices:
            self.active_mesh.vertices[idx, 0] += world_dx * 0.1  # X movement
            self.active_mesh.vertices[idx, 1] -= world_dy * 0.1  # Y movement (inverted for screen coords)

        # Create a command for undo/redo
        new_positions = {idx: self.active_mesh.vertices[idx].copy() for idx in self.selected_vertices}
        command = MoveVerticesCommand(self.active_mesh, old_positions, new_positions)
        engine.command_manager.execute(command)

    def _get_renderer(self, engine):
        """Helper to get the renderer from the engine"""
        for app in engine.scene.root.children:
            if hasattr(app, 'renderer'):
                return app.renderer
        return None

    def _handle_click(self, engine, button):
        """Handle mouse click"""
        # Placeholder - will implement later
        pass

    def _handle_zoom(self, engine, amount):
        """Handle mouse wheel zoom"""
        renderer = self._get_renderer(engine)
        if not renderer:
            return

        # Adjust scale based on zoom amount
        zoom_factor = 1.0 + amount
        renderer.scale *= zoom_factor

        # Limit scale range
        renderer.scale = max(10, min(500, renderer.scale))

    def _handle_drag(self, engine):
        """Handle mouse drag to rotate/pan/orbit the view"""
        current_pos = self.mouse_position
        dx = current_pos[0] - self.drag_start[0]
        dy = current_pos[1] - self.drag_start[1]

        # Update the drag start for incremental movement
        self.drag_start = current_pos

        # Get renderer
        renderer = self._get_renderer(engine)
        if not renderer:
            return

        # Get active mesh if none is selected
        if not self.active_mesh:
            for obj in engine.scene.root.children:
                if hasattr(obj, 'vertices') and len(obj.vertices) > 0:
                    self.active_mesh = obj
                    break

        # Left mouse button: Rotate the OBJECT ITSELF
        if self.mouse_buttons[0]:
            if not self.active_mesh:
                return

            # Convert to radians and scale down the movement
            # Invert dx to make rotation direction match mouse movement
            dx_rad = -dx * 0.01
            dy_rad = dy * 0.01

            # Create rotation matrices for screen-aligned rotation
            # X rotation (up/down mouse movement)
            cos_x = np.cos(dy_rad)
            sin_x = np.sin(dy_rad)
            rx = np.array([
                [1, 0, 0],
                [0, cos_x, -sin_x],
                [0, sin_x, cos_x]
            ])

            # Y rotation (left/right mouse movement)
            cos_y = np.cos(dx_rad)
            sin_y = np.sin(dx_rad)
            ry = np.array([
                [cos_y, 0, sin_y],
                [0, 1, 0],
                [-sin_y, 0, cos_y]
            ])

            # Apply rotation directly to the mesh vertices
            # Create rotation matrix
            new_rotation = np.dot(ry, rx)

            # Apply to each vertex of the active mesh
            vertices = self.active_mesh.vertices
            for i in range(len(vertices)):
                # Apply the rotation
                vertices[i] = np.dot(new_rotation, vertices[i])

        # Middle mouse button: pan (move in screen space)
        elif self.mouse_buttons[1]:
            # Pan the view by adjusting the translation
            renderer.translate[0] += dx
            renderer.translate[1] += dy

        # Right mouse button: Orbit the VIEW/CAMERA around the object
        elif self.mouse_buttons[2]:
            # Convert to radians and scale down the movement
            dx_rad = dx * 0.01
            dy_rad = dy * 0.01

            # Update the orbit angles
            renderer.orbit_camera(dx_rad, -dy_rad)

            # Calculate new rotation matrix based on orbit angles
            h_angle = renderer.orbit_angle_horizontal
            v_angle = renderer.orbit_angle_vertical

            # Horizontal rotation (around Y axis)
            cos_h = np.cos(h_angle)
            sin_h = np.sin(h_angle)
            ry = np.array([
                [cos_h, 0, sin_h],
                [0, 1, 0],
                [-sin_h, 0, cos_h]
            ])

            # Vertical rotation (around X axis)
            cos_v = np.cos(v_angle)
            sin_v = np.sin(v_angle)
            rx = np.array([
                [1, 0, 0],
                [0, cos_v, -sin_v],
                [0, sin_v, cos_v]
            ])

            # Create the orbit rotation matrix for the view
            orbit_rotation = np.dot(ry, rx)

            # Apply to the renderer's rotation matrix (for grid and scene)
            renderer.rotation_matrix = orbit_rotation

    def _handle_keydown(self, engine, key):
        """Handle key press"""
        # Toggle selection mode
        if key == pygame.K_1:
            self.selection_mode = "object"
            print("Selection mode: Object")
        elif key == pygame.K_2:
            self.selection_mode = "vertex"
            print("Selection mode: Vertex")
        elif key == pygame.K_3:
            self.selection_mode = "edge"
            print("Selection mode: Edge")
        elif key == pygame.K_4:
            self.selection_mode = "face"
            print("Selection mode: Face")
        # Undo/Redo
        elif key == pygame.K_z and self.modifiers["ctrl"]:
            engine.undo()
        elif key == pygame.K_y and self.modifiers["ctrl"]:
            engine.redo()
        # Delete selected vertices
        elif key == pygame.K_DELETE and self.selection_mode == "vertex":
            self._delete_selected_vertices(engine)
        # Toggle wireframe mode
        elif key == pygame.K_w:
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'wireframe_mode'):
                renderer.wireframe_mode = not renderer.wireframe_mode
                print(f"Wireframe mode: {renderer.wireframe_mode}")
        # Toggle backface culling
        elif key == pygame.K_b:
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'enable_backface_culling'):
                renderer.enable_backface_culling = not renderer.enable_backface_culling
                print(f"Backface culling: {renderer.enable_backface_culling}")
        # Toggle grid
        elif key == pygame.K_g:
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'show_grid'):
                renderer.show_grid = not renderer.show_grid
                print(f"Floor grid: {renderer.show_grid}")
        # Reset view rotation
        elif key == pygame.K_r:
            renderer = self._get_renderer(engine)
            if renderer:
                renderer.rotation_matrix = np.identity(3)
                renderer.orbit_angle_horizontal = 0.0
                renderer.orbit_angle_vertical = 0.0
                print("View reset")

    def _delete_selected_vertices(self, engine):
        """Delete selected vertices (placeholder)"""
        if not self.active_mesh or not self.selected_vertices:
            return

        print(f"Would delete vertices: {self.selected_vertices}")
        # In a real implementation, this would need to:
        # 1. Remove the vertices
        # 2. Update all face and edge indices
        # 3. Create a proper command for undo/redo