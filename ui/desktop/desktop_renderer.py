import pygame
import numpy as np


class DesktopRenderer:
    def __init__(self, scene):
        self.scene = scene
        self.width = 800
        self.height = 600
        self.scale = 30  # Drastically reduced scale
        self.translate = [self.width // 2, self.height // 2]  # Center of screen

        # Add rotation matrix attribute
        self.rotation_matrix = np.identity(3)  # Identity matrix (no rotation)

        # Keep these for compatibility with existing code
        self.rotation_x = 0.7  # Initial rotation
        self.rotation_y = 0.7
        self.rotation_z = 0

        # 3D orbit camera parameters
        self.orbit_distance = 10.0
        self.orbit_angle_horizontal = 0.0
        self.orbit_angle_vertical = 0.0

        self.show_vertices = True  # New attribute for vertex display
        self.wireframe_mode = False  # Option to show only wireframe
        self.enable_backface_culling = False  # Show all faces
        self.show_grid = True  # Option to show/hide the floor grid

    def render(self, camera):
        """Render the scene using Pygame"""
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

        # Apply rotation
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

        # Set a single color for all faces
        base_color = (180, 180, 220)  # Light blue-gray color for all faces

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
                pygame.draw.polygon(surface, (30, 30, 30), face_points, 1)

        # Draw edges if no faces are available or in wireframe mode
        elif len(mesh.edges) > 0:
            for edge in mesh.edges:
                if edge[0] < len(projected) and edge[1] < len(projected):
                    pygame.draw.line(surface, (255, 255, 255), projected[edge[0]], projected[edge[1]], 1)

        # Draw vertices as small circles if requested
        if self.show_vertices:
            for point in projected:
                pygame.draw.circle(surface, (255, 0, 0), point, 2)

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

    def orbit_camera(self, delta_h, delta_v):
        """Orbit the camera around the object"""
        # Update orbit angles
        self.orbit_angle_horizontal += delta_h
        self.orbit_angle_vertical += delta_v

        # Limit vertical angle to avoid flipping
        self.orbit_angle_vertical = max(-np.pi / 2 + 0.1, min(np.pi / 2 - 0.1, self.orbit_angle_vertical))