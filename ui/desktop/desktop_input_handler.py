import pygame
import numpy as np
from core.commands import MoveVerticesCommand, MoveObjectCommand, ScaleObjectCommand, DeleteObjectCommand


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

        # Gizmo interaction state
        self.dragging_gizmo = False
        self.active_gizmo_axis = None
        self.gizmo_drag_start_value = None

        # Separate rotation matrices for object and view
        self.view_rotation = np.identity(3)  # View/camera rotation

    def _get_renderer(self, engine):
        """Helper to get the renderer from the engine"""
        for app in engine.scene.root.children:
            if hasattr(app, 'renderer'):
                return app.renderer
        return None

    def handle_event(self, event, engine):
        """Handle input events"""
        if event.type == pygame.MOUSEBUTTONDOWN:
            button_idx = event.button - 1
            if 0 <= button_idx < len(self.mouse_buttons):
                self.mouse_buttons[button_idx] = True
            self.drag_start = event.pos

            # Get renderer
            renderer = self._get_renderer(engine)
            if renderer and renderer.show_orientation_gizmo:
                # Check if the click was on the orientation gizmo
                if hasattr(renderer, 'handle_gizmo_click'):
                    if renderer.handle_gizmo_click(event.pos):
                        return  # Handled by gizmo, don't process further

            # Check if clicking on a gizmo
            if button_idx == 0 and renderer and renderer.show_gizmos:
                axis = renderer.get_axis_at_screen_pos(self.mouse_position)
                if axis:
                    self.dragging_gizmo = True
                    self.active_gizmo_axis = axis

                    # Store initial object position/scale
                    if renderer.scene.selected_objects:
                        obj = renderer.scene.selected_objects[0]
                        if renderer.transform_mode == "move":
                            self.gizmo_drag_start_value = obj.transform.position.copy()
                        elif renderer.transform_mode == "scale":
                            self.gizmo_drag_start_value = obj.transform.scale.copy()

                    self.dragging = True
                    return

            self.dragging = True

            # Handle selecting elements based on selection mode
            if button_idx == 0 and not self.modifiers["alt"]:  # Left click without Alt
                if not self.dragging_gizmo:
                    self._handle_selection(engine)
            else:
                self._handle_click(engine, event.button)

        elif event.type == pygame.MOUSEMOTION:
            self.mouse_position = event.pos

            # Get the renderer
            renderer = self._get_renderer(engine)
            if not renderer:
                return

            # If gizmos are showing, highlight the axis under mouse
            if renderer.show_gizmos and not self.dragging:
                renderer.active_axis = renderer.get_axis_at_screen_pos(self.mouse_position)

            # Handle dragging
            if self.dragging:
                if self.dragging_gizmo:
                    self._handle_gizmo_drag(engine)
                elif self.modifiers["alt"] and self.selection_mode == "vertex" and self.selected_vertices:
                    # Manipulate vertices when Alt is pressed
                    self._handle_vertex_manipulation(engine)
                else:
                    # Normal camera movement
                    self._handle_drag(engine)

        elif event.type == pygame.MOUSEBUTTONUP:
            button_idx = event.button - 1
            if 0 <= button_idx < len(self.mouse_buttons):
                self.mouse_buttons[button_idx] = False
            self.dragging = False
            self.dragging_gizmo = False
            self.active_gizmo_axis = None

        elif event.type == pygame.MOUSEWHEEL:
            # Handle mouse wheel scrolling for zoom
            zoom_amount = event.y * 0.1  # Y is the vertical scroll amount
            self._handle_zoom(engine, zoom_amount)

        elif event.type == pygame.KEYDOWN:
            self._update_modifiers(event.key, True)
            self._handle_keydown(engine, event.key)

        elif event.type == pygame.KEYUP:
            self._update_modifiers(event.key, False)

    def _handle_gizmo_drag(self, engine):
        """Handle dragging a transformation gizmo"""
        if not self.active_gizmo_axis or not self.dragging_gizmo:
            return

        renderer = self._get_renderer(engine)
        if not renderer or not renderer.scene.selected_objects:
            return

        obj = renderer.scene.selected_objects[0]

        # Calculate mouse movement
        dx = self.mouse_position[0] - self.drag_start[0]
        dy = self.mouse_position[1] - self.drag_start[1]

        # Update drag start for incremental movement
        self.drag_start = self.mouse_position

        # Convert screen movement to 3D world movement
        scale_factor = 0.01  # Adjust based on sensitivity needed

        # Get axis direction in world space
        if self.active_gizmo_axis == "x":
            axis = np.array([1, 0, 0])
        elif self.active_gizmo_axis == "y":
            axis = np.array([0, 1, 0])
        elif self.active_gizmo_axis == "z":
            axis = np.array([0, 0, 1])
        elif self.active_gizmo_axis == "center":  # For uniform scaling
            # Special case - will handle below
            pass
        else:
            return

        # Transform the axis based on view rotation (simplified)
        if self.active_gizmo_axis != "center":
            # Project movement along the axis
            axis_rotated = np.dot(renderer.rotation_matrix, axis)

            # Calculate the movement direction
            # For simplicity, we'll use the 2D projection of the axis
            axis_2d = np.array([axis_rotated[0], axis_rotated[1]])
            axis_2d_len = np.linalg.norm(axis_2d)

            if axis_2d_len > 0.001:
                axis_2d = axis_2d / axis_2d_len
                # Project mouse movement along the axis
                movement = dx * axis_2d[0] + dy * axis_2d[1]
            else:
                # Fallback if axis is pointing directly into/out of screen
                movement = dx
        else:
            # For uniform scaling, use diagonal movement
            movement = (dx + dy) * 0.5

        # Apply transformation based on mode
        if renderer.transform_mode == "move" and self.active_gizmo_axis != "center":
            # Calculate movement along the selected axis
            delta = axis * movement * scale_factor

            # Update position
            new_position = obj.transform.position + delta

            # Create and execute command
            cmd = MoveObjectCommand(obj, obj.transform.position.copy(), new_position)
            engine.command_manager.execute(cmd)

        elif renderer.transform_mode == "scale":
            # Calculate scale factor
            scale_change = 1.0 + movement * scale_factor

            if scale_change <= 0:
                scale_change = 0.01  # Prevent negative/zero scale

            # Update scale
            if self.active_gizmo_axis == "center":
                # Uniform scaling
                new_scale = obj.transform.scale * scale_change
            else:
                # Scale along selected axis
                new_scale = obj.transform.scale.copy()
                if self.active_gizmo_axis == "x":
                    new_scale[0] *= scale_change
                elif self.active_gizmo_axis == "y":
                    new_scale[1] *= scale_change
                elif self.active_gizmo_axis == "z":
                    new_scale[2] *= scale_change

            # Create and execute command
            cmd = ScaleObjectCommand(obj, obj.transform.scale.copy(), new_scale)
            engine.command_manager.execute(cmd)

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
        # Get renderer
        renderer = self._get_renderer(engine)
        if not renderer:
            return

        # Simple object selection - select the first mesh
        for obj in engine.scene.root.children:
            if hasattr(obj, 'vertices') and len(obj.vertices) > 0:
                self.active_mesh = obj
                engine.scene.clear_selection()
                engine.scene.select_object(obj)
                print(f"Selected object: {obj.name}")
                return

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

        # Apply minimal limit to prevent issues with extremely small values
        # But allow much larger zooming range with no upper limit
        renderer.scale = max(0.1, renderer.scale)

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
            # Use negative dx to make rotation direction intuitive
            dx_rad = -dx * 0.01
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
        # Delete selected objects or vertices
        elif key == pygame.K_DELETE:
            if self.selection_mode == "object":
                self._delete_selected_objects(engine)
            elif self.selection_mode == "vertex":
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
        elif key == pygame.K_g and self.modifiers["ctrl"]:
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'show_grid'):
                renderer.show_grid = not renderer.show_grid
                print(f"Floor grid: {renderer.show_grid}")
        # Toggle orientation gizmo
        elif key == pygame.K_o and self.modifiers["ctrl"]:
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'show_orientation_gizmo'):
                renderer.show_orientation_gizmo = not renderer.show_orientation_gizmo
                print(f"Orientation gizmo: {renderer.show_orientation_gizmo}")
        # Standard view shortcuts
        elif key == pygame.K_F1:  # Front view
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'set_standard_view'):
                renderer.set_standard_view('front')
        elif key == pygame.K_F2:  # Right view
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'set_standard_view'):
                renderer.set_standard_view('right')
        elif key == pygame.K_F3:  # Top view
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'set_standard_view'):
                renderer.set_standard_view('top')
        elif key == pygame.K_F4:  # Left view
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'set_standard_view'):
                renderer.set_standard_view('left')
        elif key == pygame.K_HOME:  # Home/reset view
            renderer = self._get_renderer(engine)
            if renderer and hasattr(renderer, 'set_standard_view'):
                renderer.set_standard_view('home')
        # Reset view rotation
        elif key == pygame.K_r:
            renderer = self._get_renderer(engine)
            if renderer:
                renderer.rotation_matrix = np.identity(3)
                renderer.orbit_angle_horizontal = 0.0
                renderer.orbit_angle_vertical = 0.0
                print("View reset")
        # Transformation shortcuts
        elif key == pygame.K_g:  # 'g' for grab/move (common in Blender)
            renderer = self._get_renderer(engine)
            if renderer:
                renderer.transform_mode = "move"
                renderer.show_gizmos = True
                print("Move mode activated")
        elif key == pygame.K_s:  # 's' for scale (common in Blender)
            renderer = self._get_renderer(engine)
            if renderer:
                renderer.transform_mode = "scale"
                renderer.show_gizmos = True
                print("Scale mode activated")
        elif key == pygame.K_ESCAPE:  # ESC to cancel transform
            renderer = self._get_renderer(engine)
            if renderer:
                renderer.show_gizmos = False
                renderer.transform_mode = None
                print("Transform mode cancelled")

    def _delete_selected_objects(self, engine):
        """Delete the selected objects from the scene"""
        # Get a copy of the selected objects to avoid modification during iteration
        selected_objects = engine.scene.selected_objects.copy()

        if not selected_objects:
            print("No objects selected to delete")
            return

        print(f"Deleting {len(selected_objects)} object(s)")

        # Delete each selected object
        for obj in selected_objects:
            # Create and execute the delete command
            cmd = DeleteObjectCommand(engine.scene, obj)
            engine.command_manager.execute(cmd)

        # Clear the selection after deletion
        engine.scene.clear_selection()

        # Update the active mesh reference
        self.active_mesh = None

    def _delete_selected_vertices(self, engine):
        """Delete selected vertices (placeholder)"""
        if not self.active_mesh or not self.selected_vertices:
            return

        print(f"Would delete vertices: {self.selected_vertices}")
        # In a real implementation, this would need to:
        # 1. Remove the vertices
        # 2. Update all face and edge indices
        # 3. Create a proper command for undo/redo