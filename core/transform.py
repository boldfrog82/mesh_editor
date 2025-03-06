
import numpy as np
import math

class Transform:
    def __init__(self):
        self.position = np.array([0.0, 0.0, 0.0])
        self.rotation = np.array([0.0, 0.0, 0.0])  # Euler angles
        self.scale = np.array([1.0, 1.0, 1.0])

    def get_matrix(self):
        """Get the transformation matrix"""
        # Create translation matrix
        trans_mat = np.identity(4)
        trans_mat[0:3, 3] = self.position

        # Create rotation matrices for X, Y, Z
        rot_x = np.identity(4)
        rot_y = np.identity(4)
        rot_z = np.identity(4)

        cx, sx = math.cos(self.rotation[0]), math.sin(self.rotation[0])
        cy, sy = math.cos(self.rotation[1]), math.sin(self.rotation[1])
        cz, sz = math.cos(self.rotation[2]), math.sin(self.rotation[2])

        rot_x[1:3, 1:3] = np.array([[cx, -sx], [sx, cx]])
        rot_y[0:3:2, 0:3:2] = np.array([[cy, -sy], [sy, cy]])
        rot_z[0:2, 0:2] = np.array([[cz, -sz], [sz, cz]])

        # Create scale matrix
        scale_mat = np.identity(4)
        np.fill_diagonal(scale_mat[0:3, 0:3], self.scale)

        # Combine matrices: T * R * S
        return trans_mat @ rot_z @ rot_y @ rot_x @ scale_mat

def combine_transforms(t1, t2):
    """Combine two transforms"""
    result = Transform()
    result.position = t1.position + t2.position
    result.rotation = t1.rotation + t2.rotation
    result.scale = t1.scale * t2.scale
    return result
