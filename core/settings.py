
class Settings:
    def __init__(self):
        self.render_settings = {
            "wireframe": False,
            "show_normals": False,
            "show_grid": True,
            "backface_culling": True,
        }

        self.editor_settings = {
            "autosave": True,
            "autosave_interval": 300,  # seconds
            "grid_size": 1.0,
            "snap_to_grid": False,
        }

        self.ui_settings = {
            "theme": "dark",
            "font_size": 14,
        }

    def load(self, filename):
        """Load settings from file"""
        # Will implement later
        pass

    def save(self, filename):
        """Save settings to file"""
        # Will implement later
        pass
