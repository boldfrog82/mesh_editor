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
        """Calculate face and vertex normals"""
        # Will implement later
        pass

    def create_primitive(self, primitive_type, size=1.0):
        """Create a primitive shape"""
        if primitive_type == "cube":
            self._create_cube(size)
        elif primitive_type == "sphere":
            self._create_sphere(size)
        # Additional primitives...

    # In mesh.py, update the _create_cube method:

    def _create_cube(self, size):
        """Create a cube mesh"""
        half = size / 2  # Use full size - removed the 0.2 reduction factor
        self.vertices = np.array([
            [-half, -half, -half],  # 0: back bottom left
            [half, -half, -half],  # 1: back bottom right
            [half, half, -half],  # 2: back top right
            [-half, half, -half],  # 3: back top left
            [-half, -half, half],  # 4: front bottom left
            [half, -half, half],  # 5: front bottom right
            [half, half, half],  # 6: front top right
            [-half, half, half]  # 7: front top left
        ], dtype=float)

        self.faces = [
            (0, 1, 2, 3),  # back
            (4, 5, 6, 7),  # front
            (0, 1, 5, 4),  # bottom
            (2, 3, 7, 6),  # top
            (0, 3, 7, 4),  # left
            (1, 2, 6, 5)  # right
        ]

        self.edges = [
            (0, 1), (1, 2), (2, 3), (3, 0),  # back face
            (4, 5), (5, 6), (6, 7), (7, 4),  # front face
            (0, 4), (1, 5), (2, 6), (3, 7)  # connecting edges
        ]

    def _create_sphere(self, size, segments=16, rings=8):
        """Create a sphere mesh using latitude/longitude method"""
        radius = size / 2

        # Clear previous data
        self.vertices = []
        self.edges = []
        self.faces = []

        # Create vertices
        # Add top vertex
        self.vertices.append([0, radius, 0])

        # Create ring vertices
        for i in range(rings):
            phi = np.pi * (i + 1) / (rings + 1)  # Angle from top (0 to pi)
            for j in range(segments):
                theta = 2 * np.pi * j / segments  # Angle around the sphere (0 to 2pi)

                # Convert spherical to Cartesian coordinates
                x = radius * np.sin(phi) * np.cos(theta)
                y = radius * np.cos(phi)
                z = radius * np.sin(phi) * np.sin(theta)

                self.vertices.append([x, y, z])

        # Add bottom vertex
        self.vertices.append([0, -radius, 0])

        # Convert vertices to numpy array
        self.vertices = np.array(self.vertices, dtype=float)

        # Create edges and faces
        # Top cap
        for i in range(segments):
            self.edges.append((0, i + 1))
            next_i = (i + 1) % segments
            self.edges.append((i + 1, next_i + 1))
            self.faces.append((0, i + 1, next_i + 1))

        # Middle rings
        for ring in range(rings - 1):
            ring_start = 1 + ring * segments
            next_ring_start = ring_start + segments

            for i in range(segments):
                current = ring_start + i
                next_in_ring = ring_start + (i + 1) % segments
                current_next_ring = next_ring_start + i
                next_in_next_ring = next_ring_start + (i + 1) % segments

                # Add edges
                self.edges.append((current, next_in_ring))
                self.edges.append((current, current_next_ring))

                # Add face
                self.faces.append((current, next_in_ring, next_in_next_ring, current_next_ring))

        # Bottom cap
        bottom_idx = 1 + rings * segments
        for i in range(segments):
            ring_idx = 1 + (rings - 1) * segments + i
            self.edges.append((ring_idx, bottom_idx))
            next_i = (i + 1) % segments
            next_ring_idx = 1 + (rings - 1) * segments + next_i
            self.edges.append((ring_idx, next_ring_idx))
            self.faces.append((bottom_idx, next_ring_idx, ring_idx))