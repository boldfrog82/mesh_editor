import pygame
import numpy as np


class DesktopRenderer:
    def __init__(self, scene):
        self.scene = scene
        self.width = 800
        self.height = 600
        self.scale = 30  # Drastically reduced scale
        self.translate = [self.width // 2, self.height // 2]  # Center of screen
        self.app = None  # Reference to app, set by desktop_app.py

        # Add rotation matrix attribute
        self.rotation_matrix = np.identity(3)  # Identity matrix (no rotation)

        # 3D orbit camera parameters
        self.orbit_distance = 10.0
        self.orbit_angle_horizontal = 0.0
        self.orbit_angle_vertical = 0.0

        # Render options
        self.show_vertices = True
        self.wireframe_mode = False
        self.enable_backface_culling = False
        self.show_grid = True

        # Transformation gizmos
        self.show_gizmos = False
        self.transform_mode = None  # "move" or "scale"
        self.active_axis = None  # "x", "y", "z", or None
        self.gizmo_size = 1.0

        # Add font for gizmo labels
        self.font = None

        # Add orientation gizmo setting
        self.show_orientation_gizmo = True
        self.view_buttons = []  # Will store the view buttons (position, radius, type)

    def init(self):
        """Initialize renderer resources"""
        # Create a font for gizmo labels if pygame font is initialized
        if pygame.font.get_init():
            self.font = pygame.font.SysFont('Arial', 12)

    def render(self, camera):
        """Render the scene using Pygame"""
        # Initialize if needed
        if self.font is None:
            self.init()

        surface = pygame.display.get_surface()

        # Fill with background color
        surface.fill((20, 20, 30))  # Dark blue-gray background

        # Draw the 3D floor grid
        if self.show_grid:
            self._draw_floor_grid(surface)

        # If we don't have a camera yet, just return
        if not camera:
            return

        # Render all meshes in the scene
        self._render_scene_objects(surface)

        # Draw transformation gizmos if active
        if self.show_gizmos and self.scene.selected_objects:
            self._draw_transformation_gizmos(surface)

        # Draw orientation gizmo on top of everything
        if self.show_orientation_gizmo:
            self._draw_orientation_gizmo(surface)

    def _render_scene_objects(self, surface):
        """Render all objects in the scene"""
        # Start with root object's children
        for obj in self.scene.root.children:
            self._render_object(surface, obj)

    def _render_object(self, surface, obj):
        """Render a single object and its children"""
        # If it's a mesh, render it
        if hasattr(obj, 'vertices') and hasattr(obj, 'edges'):
            self._render_mesh(surface, obj)

        # Render all children
        for child in obj.children:
            self._render_object(surface, child)

    def _render_mesh(self, surface, mesh):
        """Render a mesh object with shading"""
        if len(mesh.vertices) == 0:
            return

        # Make a copy of the vertices for transformation
        vertices = mesh.vertices.copy()

        # Apply object's own transformation matrix - THIS IS THE KEY CHANGE
        if hasattr(mesh, 'transform'):
            # Create transformation matrix
            transform_matrix = np.identity(4)

            # Apply scale
            scale_matrix = np.identity(4)
            np.fill_diagonal(scale_matrix[0:3, 0:3], mesh.transform.scale)
            transform_matrix = np.dot(transform_matrix, scale_matrix)

            # Apply rotation (simplified for now)
            # Full implementation would use mesh.transform.rotation

            # Apply position
            transform_matrix[0:3, 3] = mesh.transform.position

            # Apply transformation to vertices
            for i in range(len(vertices)):
                # Convert to homogeneous coordinates
                v_homo = np.append(vertices[i], 1.0)
                # Apply transformation
                v_transformed = np.dot(transform_matrix, v_homo)
                # Convert back to 3D coordinates
                vertices[i] = v_transformed[0:3]

        # Apply view rotation
        self._rotate_vertices(vertices)

        # Project vertices to 2D
        projected = []
        for v in vertices:
            # Simple perspective projection
            z_depth = v[2] + 5
            if z_depth <= 0.1:  # Avoid division by zero or negative values
                z_depth = 0.1
            factor = 200 / z_depth
            x = v[0] * self.scale * factor + self.translate[0]
            y = v[1] * self.scale * factor + self.translate[1]
            projected.append((int(x), int(y)))

        # Set color based on selection state
        base_color = (220, 220, 100) if mesh.selected else (
        180, 180, 220)  # Yellow for selected, blue-gray for unselected
        outline_color = (255, 255, 0) if mesh.selected else (30, 30, 30)  # Bright yellow outline for selected objects
        outline_width = 2 if mesh.selected else 1  # Thicker outline for selected objects

        # Calculate face properties and determine visibility
        if hasattr(mesh, 'faces') and len(mesh.faces) > 0:
            # Collection to store all face data for sorting
            all_faces = []

            for face_idx, face in enumerate(mesh.faces):
                if len(face) >= 3:  # Need at least 3 points for a face
                    # Calculate the face normal (using first 3 vertices)
                    v0 = vertices[face[0]]
                    v1 = vertices[face[1]]
                    v2 = vertices[face[2]]

                    # Calculate edges
                    edge1 = v1 - v0
                    edge2 = v2 - v0

                    # Calculate normal using cross product
                    normal = np.cross(edge1, edge2)

                    # Normalize normal vector
                    normal_length = np.linalg.norm(normal)
                    if normal_length > 0:
                        normal = normal / normal_length

                    # Calculate face center for depth sorting
                    center = np.mean([vertices[i] for i in face], axis=0)
                    z_depth = center[2]

                    # Viewing direction (from camera to face)
                    view_dir = np.array([0, 0, 1])

                    # Determine face visibility
                    dot_product = np.dot(normal, view_dir)
                    is_front_face = dot_product < 0

                    # Always render the face if backface culling is disabled
                    if not self.enable_backface_culling or is_front_face:
                        # Calculate lighting intensity
                        light_dir = np.array([0.5, -0.7, 1.0])  # Light from top-right-front
                        light_dir = light_dir / np.linalg.norm(light_dir)

                        # Use absolute dot product to ensure all faces are lit
                        intensity = abs(np.dot(normal, light_dir))
                        intensity = max(0.3, min(1.0, intensity))  # Higher ambient light

                        # Apply lighting to color
                        color = tuple(int(c * intensity) for c in base_color)

                        # Store face data for sorting
                        face_points = [projected[i] for i in face]
                        all_faces.append((face_points, color, z_depth, is_front_face))

            # Sort faces by depth (furthest first)
            all_faces.sort(key=lambda f: f[2], reverse=True)

            # Draw faces
            for face_points, color, _, _ in all_faces:
                if not self.wireframe_mode:
                    pygame.draw.polygon(surface, color, face_points)
                # Always draw edges for better visibility
                pygame.draw.polygon(surface, outline_color, face_points, outline_width)

            # # Find this section in the _render_mesh method in desktop_renderer.py
            # # and remove or comment out this entire block of code:
            #
            # # Draw selected object bounding box if object is selected
            # """
            # if mesh.selected:
            #     min_x = min_y = float('inf')
            #     max_x = max_y = float('-inf')
            #
            #     # Find bounds of all projected points
            #     for px, py in projected:
            #         min_x = min(min_x, px)
            #         min_y = min(min_y, py)
            #         max_x = max(max_x, px)
            #         max_y = max(max_y, py)
            #
            #     # Draw dashed bounding box
            #     dash_length = 5
            #     rect_points = [
            #         (min_x, min_y), (max_x, min_y),
            #         (max_x, max_y), (min_x, max_y)
            #     ]
            #
            #     for i in range(4):
            #         start = rect_points[i]
            #         end = rect_points[(i + 1) % 4]
            #
            #         # Draw dashed line
            #         dx = end[0] - start[0]
            #         dy = end[1] - start[1]
            #         length = ((dx ** 2) + (dy ** 2)) ** 0.5
            #
            #         if length > 0:
            #             dx /= length
            #             dy /= length
            #
            #             # Draw dashes
            #             pos = start
            #             drawn = 0
            #             drawing = True
            #
            #             while drawn < length:
            #                 segment_length = min(dash_length, length - drawn)
            #                 end_seg = (pos[0] + dx * segment_length, pos[1] + dy * segment_length)
            #
            #                 if drawing:
            #                     pygame.draw.line(surface, (255, 255, 0), pos, end_seg, 1)
            #
            #                 pos = end_seg
            #                 drawn += segment_length
            #                 drawing = not drawing
            # """

        # Draw edges if no faces are available or in wireframe mode
        elif len(mesh.edges) > 0:
            for edge in mesh.edges:
                if edge[0] < len(projected) and edge[1] < len(projected):
                    pygame.draw.line(surface, outline_color, projected[edge[0]], projected[edge[1]], outline_width)

        # Draw vertices as small circles if requested
        if self.show_vertices:
            vertex_color = (255, 100, 0) if mesh.selected else (255, 0, 0)  # Orange for selected, red for unselected
            vertex_size = 3 if mesh.selected else 2  # Larger for selected

            for point in projected:
                pygame.draw.circle(surface, vertex_color, point, vertex_size)

    def _draw_transformation_gizmos(self, surface):
        """Draw 3D transformation gizmos for the selected object"""
        if not self.scene.selected_objects:
            return

        obj = self.scene.selected_objects[0]
        if not hasattr(obj, 'transform'):
            return

        # Get object position
        obj_pos = obj.transform.position.copy()

        # Apply view rotation
        rotated_pos = np.dot(self.rotation_matrix, obj_pos)

        # Project to screen space
        z_depth = rotated_pos[2] + 5
        if z_depth <= 0.1:
            z_depth = 0.1
        factor = 200 / z_depth
        screen_pos = (
            int(rotated_pos[0] * self.scale * factor + self.translate[0]),
            int(rotated_pos[1] * self.scale * factor + self.translate[1])
        )

        # Set gizmo axis colors
        x_color = (255, 0, 0)  # Red for X
        y_color = (0, 255, 0)  # Green for Y
        z_color = (0, 0, 255)  # Blue for Z

        # Highlight active axis
        if self.active_axis == 'x':
            x_color = (255, 200, 200)
        elif self.active_axis == 'y':
            y_color = (200, 255, 200)
        elif self.active_axis == 'z':
            z_color = (200, 200, 255)

        # Calculate axis directions in screen space
        axis_length = 50  # Length of axis arrows in pixels

        # Create rotation matrices for X, Y, Z axes
        x_axis = np.dot(self.rotation_matrix, np.array([1, 0, 0]))
        y_axis = np.dot(self.rotation_matrix, np.array([0, 1, 0]))
        z_axis = np.dot(self.rotation_matrix, np.array([0, 0, 1]))

        # Project to screen space
        x_end = (
            int(screen_pos[0] + x_axis[0] * axis_length),
            int(screen_pos[1] + x_axis[1] * axis_length)
        )

        y_end = (
            int(screen_pos[0] + y_axis[0] * axis_length),
            int(screen_pos[1] + y_axis[1] * axis_length)
        )

        z_end = (
            int(screen_pos[0] + z_axis[0] * axis_length),
            int(screen_pos[1] + z_axis[1] * axis_length)
        )

        # Draw the gizmo axes
        if self.transform_mode == "move":
            # Draw move arrows
            pygame.draw.line(surface, x_color, screen_pos, x_end, 3)
            pygame.draw.line(surface, y_color, screen_pos, y_end, 3)
            pygame.draw.line(surface, z_color, screen_pos, z_end, 3)

            # Draw arrowheads
            self._draw_arrowhead(surface, x_end, x_axis, x_color, 8)
            self._draw_arrowhead(surface, y_end, y_axis, y_color, 8)
            self._draw_arrowhead(surface, z_end, z_axis, z_color, 8)

        elif self.transform_mode == "scale":
            # Draw scale handles
            pygame.draw.line(surface, x_color, screen_pos, x_end, 2)
            pygame.draw.line(surface, y_color, screen_pos, y_end, 2)
            pygame.draw.line(surface, z_color, screen_pos, z_end, 2)

            # Draw scale boxes
            handle_size = 6
            pygame.draw.rect(surface, x_color,
                             (x_end[0] - handle_size // 2, x_end[1] - handle_size // 2, handle_size, handle_size))
            pygame.draw.rect(surface, y_color,
                             (y_end[0] - handle_size // 2, y_end[1] - handle_size // 2, handle_size, handle_size))
            pygame.draw.rect(surface, z_color,
                             (z_end[0] - handle_size // 2, z_end[1] - handle_size // 2, handle_size, handle_size))

            # Draw center handle for uniform scaling
            pygame.draw.circle(surface, (255, 255, 255), screen_pos, 8)

    def _draw_arrowhead(self, surface, tip_pos, direction, color, size):
        """Draw an arrowhead at the given position"""
        # Create a right angle to the direction vector
        perp = np.array([-direction[1], direction[0], 0])
        perp_len = np.linalg.norm(perp)
        if perp_len > 0:
            perp = perp / perp_len

        # Create two points for the base of the arrowhead
        p1 = (
            int(tip_pos[0] - direction[0] * size - perp[0] * size / 2),
            int(tip_pos[1] - direction[1] * size - perp[1] * size / 2)
        )

        p2 = (
            int(tip_pos[0] - direction[0] * size + perp[0] * size / 2),
            int(tip_pos[1] - direction[1] * size + perp[1] * size / 2)
        )

        # Draw the arrowhead
        pygame.draw.polygon(surface, color, [tip_pos, p1, p2])

    def _draw_orientation_gizmo(self, surface):
        """Draw a 3ds Max style orientation gizmo in the corner with clickable view buttons"""
        # Set up position and size
        screen_width, screen_height = surface.get_size()
        gizmo_size = 80
        margin = 20
        center_x = screen_width - margin - gizmo_size // 2
        center_y = screen_height - margin - gizmo_size // 2

        # Draw background circle
        pygame.draw.circle(surface, (40, 40, 50), (center_x, center_y), gizmo_size // 2)
        pygame.draw.circle(surface, (80, 80, 100), (center_x, center_y), gizmo_size // 2, 1)

        # Set up colors for view buttons
        view_colors = {
            'top': (190, 190, 190),  # White/Light gray
            'bottom': (150, 150, 150),  # Gray
            'left': (220, 60, 60),  # Red
            'right': (220, 120, 120),  # Light red
            'front': (60, 220, 60),  # Green
            'back': (120, 220, 120),  # Light green
            'home': (220, 220, 60)  # Yellow
        }

        # Store the view buttons with their positions and click handlers
        # Each button is (centerX, centerY, radius, label, callback_type)
        button_radius = gizmo_size // 8
        self.view_buttons = []

        # Top button (Y+)
        top_pos = (center_x, center_y - gizmo_size // 3)
        pygame.draw.circle(surface, view_colors['top'], top_pos, button_radius)
        pygame.draw.circle(surface, (255, 255, 255), top_pos, button_radius, 1)
        if self.font:
            label = self.font.render("Top", True, (0, 0, 0))
            label_rect = label.get_rect(center=top_pos)
            surface.blit(label, label_rect)
        self.view_buttons.append((*top_pos, button_radius, "top"))

        # Front button (Z+)
        front_pos = (center_x, center_y + gizmo_size // 3)
        pygame.draw.circle(surface, view_colors['front'], front_pos, button_radius)
        pygame.draw.circle(surface, (255, 255, 255), front_pos, button_radius, 1)
        if self.font:
            label = self.font.render("Front", True, (0, 0, 0))
            label_rect = label.get_rect(center=front_pos)
            surface.blit(label, label_rect)
        self.view_buttons.append((*front_pos, button_radius, "front"))

        # Right button (X+)
        right_pos = (center_x + gizmo_size // 3, center_y)
        pygame.draw.circle(surface, view_colors['right'], right_pos, button_radius)
        pygame.draw.circle(surface, (255, 255, 255), right_pos, button_radius, 1)
        if self.font:
            label = self.font.render("Right", True, (0, 0, 0))
            label_rect = label.get_rect(center=right_pos)
            surface.blit(label, label_rect)
        self.view_buttons.append((*right_pos, button_radius, "right"))

        # Left button (X-)
        left_pos = (center_x - gizmo_size // 3, center_y)
        pygame.draw.circle(surface, view_colors['left'], left_pos, button_radius)
        pygame.draw.circle(surface, (255, 255, 255), left_pos, button_radius, 1)
        if self.font:
            label = self.font.render("Left", True, (0, 0, 0))
            label_rect = label.get_rect(center=left_pos)
            surface.blit(label, label_rect)
        self.view_buttons.append((*left_pos, button_radius, "left"))

        # Home/Reset button (center)
        home_pos = (center_x, center_y)
        pygame.draw.circle(surface, view_colors['home'], home_pos, button_radius)
        pygame.draw.circle(surface, (255, 255, 255), home_pos, button_radius, 1)
        if self.font:
            label = self.font.render("Home", True, (0, 0, 0))
            label_rect = label.get_rect(center=home_pos)
            surface.blit(label, label_rect)
        self.view_buttons.append((*home_pos, button_radius, "home"))

    def handle_gizmo_click(self, pos):
        """Handle clicks on the orientation gizmo"""
        # Check if any of the view buttons were clicked
        for x, y, radius, view_type in self.view_buttons:
            # Calculate distance to button center
            dx = pos[0] - x
            dy = pos[1] - y
            dist = (dx * dx + dy * dy) ** 0.5

            if dist <= radius:
                # Button was clicked
                self.set_standard_view(view_type)
                return True

        return False

    # Replace the set_standard_view method in desktop_renderer.py completely

    def set_standard_view(self, view_type):
        """Set a standard view based on type"""
        if view_type == "top":
            # Top view: Y is up
            self.rotation_matrix = np.array([
                [1, 0, 0],
                [0, 0, -1],
                [0, 1, 0]
            ])
            self.orbit_angle_horizontal = 0
            self.orbit_angle_vertical = -np.pi / 2 + 0.1

        elif view_type == "front":
            # Front view: Z is forward, Y is up
            self.rotation_matrix = np.array([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ])
            self.orbit_angle_horizontal = 0
            self.orbit_angle_vertical = 0

        elif view_type == "right":
            # Right view: X is right
            self.rotation_matrix = np.array([
                [0, 0, -1],
                [0, 1, 0],
                [1, 0, 0]
            ])
            self.orbit_angle_horizontal = -np.pi / 2
            self.orbit_angle_vertical = 0

        elif view_type == "left":
            # Left view: X is right (reversed)
            self.rotation_matrix = np.array([
                [0, 0, 1],
                [0, 1, 0],
                [-1, 0, 0]
            ])
            self.orbit_angle_horizontal = np.pi / 2
            self.orbit_angle_vertical = 0

        elif view_type == "home":
            # Create a direct rotation matrix for perfect isometric view
            # This is a fixed isometric view matrix - (1,1,1) direction view
            s3 = np.sqrt(3)
            self.rotation_matrix = np.array([
                [np.sqrt(2) / 2, 0, -np.sqrt(2) / 2],
                [-1 / s3, np.sqrt(2 / 3), -1 / s3],
                [1 / s3, np.sqrt(2 / 3), 1 / s3]
            ])

            # Set orbit angles - approximate values matching the matrix
            self.orbit_angle_horizontal = -np.pi / 4  # -45 degrees
            self.orbit_angle_vertical = np.arctan(1 / np.sqrt(2))  # ~35.264 degrees

        print(f"View changed to: {view_type}")

    def orbit_camera(self, delta_h, delta_v):
        """Orbit the camera around the object"""
        # Update orbit angles
        self.orbit_angle_horizontal += delta_h
        self.orbit_angle_vertical += delta_v

        # No vertical angle limits to allow full rotation
        # Horizontal angle will naturally wrap around in calculations

    def _rotate_vertices(self, vertices):
        """Apply rotation to vertices using rotation matrix"""
        # Apply the stored rotation matrix to each vertex
        for i in range(len(vertices)):
            vertices[i] = np.dot(self.rotation_matrix, vertices[i])

    def _draw_floor_grid(self, surface):
        """Draw a 3D floor grid on the XZ plane (y=0)"""
        # Grid settings
        grid_size = 10  # Grid extends from -grid_size to +grid_size
        grid_spacing = 1.0  # Space between grid lines

        # Create grid lines
        grid_lines = []

        # X-axis grid lines (parallel to X-axis)
        for i in range(-grid_size, grid_size + 1):
            # Line from (-grid_size, 0, i) to (grid_size, 0, i)
            z = i * grid_spacing
            start = np.array([-grid_size * grid_spacing, 0, z])
            end = np.array([grid_size * grid_spacing, 0, z])
            grid_lines.append((start, end))

        # Z-axis grid lines (parallel to Z-axis)
        for i in range(-grid_size, grid_size + 1):
            # Line from (i, 0, -grid_size) to (i, 0, grid_size)
            x = i * grid_spacing
            start = np.array([x, 0, -grid_size * grid_spacing])
            end = np.array([x, 0, grid_size * grid_spacing])
            grid_lines.append((start, end))

        # Transform and project grid lines
        for start, end in grid_lines:
            # Apply rotation
            start_rotated = np.dot(self.rotation_matrix, start)
            end_rotated = np.dot(self.rotation_matrix, end)

            # Check if the line is in front of the camera
            start_z = start_rotated[2] + 5
            end_z = end_rotated[2] + 5

            # Skip lines that are behind or too close to the camera
            if start_z <= 0.1 and end_z <= 0.1:
                continue

            # Handle case where part of line crosses the camera plane
            if start_z <= 0.1:
                # Move the start point to be slightly in front of camera
                t = (0.1 - start_z) / (end_z - start_z)
                start_rotated = start_rotated + t * (end_rotated - start_rotated)
                start_z = 0.1

            if end_z <= 0.1:
                # Move the end point to be slightly in front of camera
                t = (0.1 - end_z) / (start_z - end_z)
                end_rotated = end_rotated + t * (start_rotated - end_rotated)
                end_z = 0.1

            # Project to 2D
            factor_start = 200 / start_z
            factor_end = 200 / end_z

            start_2d = (
                int(start_rotated[0] * self.scale * factor_start + self.translate[0]),
                int(start_rotated[1] * self.scale * factor_start + self.translate[1])
            )

            end_2d = (
                int(end_rotated[0] * self.scale * factor_end + self.translate[0]),
                int(end_rotated[1] * self.scale * factor_end + self.translate[1])
            )

            # Determine grid line color - highlight main axes
            if (abs(start[0]) < 0.01 or abs(start[2]) < 0.01):
                # Main axes (X and Z) get brighter colors
                if abs(start[0]) < 0.01:  # Z-axis (blue)
                    color = (50, 50, 180)
                else:  # X-axis (red)
                    color = (180, 50, 50)
                line_width = 2
            else:
                # Regular grid lines
                color = (80, 80, 80)
                line_width = 1

            # Draw the line
            pygame.draw.line(surface, color, start_2d, end_2d, line_width)

        # Draw center point
        origin_3d = np.array([0, 0, 0])
        origin_rotated = np.dot(self.rotation_matrix, origin_3d)

        # Check if origin is in front of camera
        origin_z = origin_rotated[2] + 5
        if origin_z > 0.1:
            factor_origin = 200 / origin_z
            origin_2d = (
                int(origin_rotated[0] * self.scale * factor_origin + self.translate[0]),
                int(origin_rotated[1] * self.scale * factor_origin + self.translate[1])
            )
            pygame.draw.circle(surface, (255, 255, 0), origin_2d, 4)

    def get_axis_at_screen_pos(self, mouse_pos):
        """Get the axis (if any) at the given screen position"""
        if not self.scene.selected_objects or not self.show_gizmos:
            return None

        obj = self.scene.selected_objects[0]
        if not hasattr(obj, 'transform'):
            return None

        # Get object position in screen space
        obj_pos = obj.transform.position.copy()
        rotated_pos = np.dot(self.rotation_matrix, obj_pos)

        z_depth = rotated_pos[2] + 5
        if z_depth <= 0.1:
            z_depth = 0.1
        factor = 200 / z_depth
        screen_pos = (
            int(rotated_pos[0] * self.scale * factor + self.translate[0]),
            int(rotated_pos[1] * self.scale * factor + self.translate[1])
        )

        # Calculate axis endpoints in screen space
        axis_length = 50

        x_axis = np.dot(self.rotation_matrix, np.array([1, 0, 0]))
        y_axis = np.dot(self.rotation_matrix, np.array([0, 1, 0]))
        z_axis = np.dot(self.rotation_matrix, np.array([0, 0, 1]))

        x_end = (
            int(screen_pos[0] + x_axis[0] * axis_length),
            int(screen_pos[1] + x_axis[1] * axis_length)
        )

        y_end = (
            int(screen_pos[0] + y_axis[0] * axis_length),
            int(screen_pos[1] + y_axis[1] * axis_length)
        )

        z_end = (
            int(screen_pos[0] + z_axis[0] * axis_length),
            int(screen_pos[1] + z_axis[1] * axis_length)
        )

        # Check for center (uniform scale) if in scale mode
        if self.transform_mode == "scale":
            center_dist = ((mouse_pos[0] - screen_pos[0]) ** 2 + (mouse_pos[1] - screen_pos[1]) ** 2) ** 0.5
            if center_dist < 10:
                return "center"  # For uniform scaling

        # Function to calculate distance from point to line segment
        def point_line_distance(p, l1, l2):
            line_len = ((l2[0] - l1[0]) ** 2 + (l2[1] - l1[1]) ** 2) ** 0.5
            if line_len == 0:
                return ((p[0] - l1[0]) ** 2 + (p[1] - l1[1]) ** 2) ** 0.5

            t = max(0, min(1, ((p[0] - l1[0]) * (l2[0] - l1[0]) + (p[1] - l1[1]) * (l2[1] - l1[1])) / (line_len ** 2)))
            proj = (
                l1[0] + t * (l2[0] - l1[0]),
                l1[1] + t * (l2[1] - l1[1])
            )
            return ((p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2) ** 0.5

        # Check distance to each axis
        threshold = 10  # Detection threshold in pixels

        x_dist = point_line_distance(mouse_pos, screen_pos, x_end)
        y_dist = point_line_distance(mouse_pos, screen_pos, y_end)
        z_dist = point_line_distance(mouse_pos, screen_pos, z_end)

        # Return the closest axis within threshold
        min_dist = min(x_dist, y_dist, z_dist)
        if min_dist > threshold:
            return None

        if min_dist == x_dist:
            return "x"
        elif min_dist == y_dist:
            return "y"
        else:
            return "z"