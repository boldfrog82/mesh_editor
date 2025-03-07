import pygame
import sys
import numpy as np
from ui.desktop.desktop_renderer import DesktopRenderer
from ui.desktop.desktop_ui_manager import DesktopUIManager
from ui.desktop.desktop_input_handler import DesktopInputHandler
from core.scene_object import SceneObject
from core.commands import MoveObjectCommand, ScaleObjectCommand


class DesktopApp(SceneObject):  # Make DesktopApp a SceneObject
    def __init__(self, engine):
        super().__init__(name="DesktopApp")  # Initialize base class
        self.engine = engine
        self.width = 800
        self.height = 600
        self.screen = None
        self.clock = None
        self.ui_manager = DesktopUIManager()
        self.input_handler = DesktopInputHandler()
        self.renderer = DesktopRenderer(engine.scene)

        # Store reference to app in renderer and UI manager for transformations
        self.renderer.app = self
        self.ui_manager.app = self

        # Initialize basic transformation state
        self.renderer.transform_mode = None
        self.renderer.show_gizmos = False
        self.renderer.active_axis = None

        # Add this app to the scene graph so input handler can find it
        engine.scene.add_object(self)

    def init(self):
        """Initialize pygame and set up the window"""
        pygame.init()
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("3D Mesh Editor")
        self.clock = pygame.time.Clock()
        self.ui_manager.init()  # Initialize UI

    def run(self):
        """Main application loop"""
        self.init()

        running = True
        while running:
            dt = self.clock.tick(60) / 1000.0

            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False

                # Process UI events first
                if not self.ui_manager.handle_event(event):
                    # If not handled by UI, pass to input handler
                    self.input_handler.handle_event(event, self.engine)

            # Update
            self.engine.update(dt)
            self.ui_manager.update(dt)

            # Check if we need to update display information based on input handler state
            if self.renderer.show_gizmos and self.engine.scene.selected_objects:
                # Update status text based on current mode
                if self.renderer.transform_mode == "move":
                    self.ui_manager.status_text = "MOVE: Click and drag colored axes"
                elif self.renderer.transform_mode == "scale":
                    self.ui_manager.status_text = "SCALE: Click and drag handles (center = uniform)"

            # Update transformation state based on keyboard commands
            if hasattr(self.ui_manager, "command_queue") and self.ui_manager.command_queue:
                command = self.ui_manager.command_queue.pop(0)
                self._handle_command(command)

            # Render
            self.screen.fill((20, 20, 30))  # Dark background
            self.renderer.render(self.engine.scene.active_camera)
            self.ui_manager.draw(self.screen)
            pygame.display.flip()

        pygame.quit()

    def _handle_command(self, command):
        """Handle commands from UI"""
        if command == "activate_move":
            self.renderer.transform_mode = "move"
            self.renderer.show_gizmos = True
            print("Move mode activated")
        elif command == "activate_scale":
            self.renderer.transform_mode = "scale"
            self.renderer.show_gizmos = True
            print("Scale mode activated")
        elif command == "cancel_transform":
            self.renderer.transform_mode = None
            self.renderer.show_gizmos = False
            print("Transform mode cancelled")
        elif command == "select_object_mode":
            self.input_handler.selection_mode = "object"
            print("Object selection mode activated")
        elif command == "select_vertex_mode":
            self.input_handler.selection_mode = "vertex"
            print("Vertex selection mode activated")

    def activate_move_mode(self):
        """Activate move transformation mode"""
        self.renderer.transform_mode = "move"
        self.renderer.show_gizmos = True
        print("Move mode activated")

    def activate_scale_mode(self):
        """Activate scale transformation mode"""
        self.renderer.transform_mode = "scale"
        self.renderer.show_gizmos = True
        print("Scale mode activated")

    def cancel_transform_mode(self):
        """Cancel current transformation mode"""
        self.renderer.transform_mode = None
        self.renderer.show_gizmos = False
        print("Transform mode cancelled")