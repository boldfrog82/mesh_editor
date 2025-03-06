import pygame
import sys
from ui.desktop.desktop_renderer import DesktopRenderer
from ui.desktop.desktop_ui_manager import DesktopUIManager
from ui.desktop.desktop_input_handler import DesktopInputHandler
from core.scene_object import SceneObject


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

                self.input_handler.handle_event(event, self.engine)
                self.ui_manager.handle_event(event)

            # Update
            self.engine.update(dt)
            self.ui_manager.update(dt)

            # Render
            self.screen.fill((0, 0, 0))
            self.renderer.render(self.engine.scene.active_camera)
            self.ui_manager.draw(self.screen)
            pygame.display.flip()

        pygame.quit()