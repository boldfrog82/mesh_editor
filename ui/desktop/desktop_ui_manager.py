import pygame


class DesktopUIManager:
    def __init__(self):
        self.buttons = []
        self.labels = []
        self.font = None
        self.small_font = None
        self.initialized = False

    def init(self):
        """Initialize UI resources"""
        if not self.initialized:
            pygame.font.init()
            self.font = pygame.font.SysFont('Arial', 14)
            self.small_font = pygame.font.SysFont('Arial', 12)
            self._setup_ui()
            self.initialized = True

    def _setup_ui(self):
        """Create UI elements"""
        # Create toolbar buttons
        button_width = 100
        button_height = 30
        margin = 5

        # Object mode button
        self.buttons.append({
            'rect': pygame.Rect(margin, margin, button_width, button_height),
            'text': 'Object Mode',
            'action': 'select_object_mode',
            'color': (100, 100, 100),
            'hover_color': (150, 150, 150)
        })

        # Vertex mode button
        self.buttons.append({
            'rect': pygame.Rect(margin + button_width + margin, margin, button_width, button_height),
            'text': 'Vertex Mode',
            'action': 'select_vertex_mode',
            'color': (100, 100, 100),
            'hover_color': (150, 150, 150)
        })

        # Add Move button
        self.buttons.append({
            'rect': pygame.Rect(margin, margin + button_height + margin, button_width, button_height),
            'text': 'Move (G)',
            'action': 'activate_move',
            'color': (100, 100, 200),
            'hover_color': (150, 150, 220)
        })

        # Add Scale button
        self.buttons.append({
            'rect': pygame.Rect(margin + button_width + margin, margin + button_height + margin, button_width,
                                button_height),
            'text': 'Scale (S)',
            'action': 'activate_scale',
            'color': (100, 100, 200),
            'hover_color': (150, 150, 220)
        })

    def handle_event(self, event):
        """Handle UI-related events"""
        self.init()  # Ensure UI is initialized

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            # Check if any button was clicked
            for button in self.buttons:
                if button['rect'].collidepoint(event.pos):
                    self._handle_button_action(button['action'])
                    return True

        return False

    def _handle_button_action(self, action):
        """Handle button actions"""
        print(f"Button action: {action}")

        # We'll handle these in desktop_app.py
        pass

    def update(self, dt):
        """Update UI state"""
        # Check mouse hover
        mouse_pos = pygame.mouse.get_pos()

        # Update button hover state
        for button in self.buttons:
            button['hover'] = button['rect'].collidepoint(mouse_pos)

    def get_transform_values(self):
        """Get the current transformation values"""
        # We don't use sliders anymore, so return default values
        return {
            'move': [0.0, 0.0, 0.0],
            'scale': [1.0, 1.0, 1.0]
        }

    def draw(self, surface):
        """Draw UI elements"""
        self.init()  # Ensure UI is initialized

        # Draw buttons
        for button in self.buttons:
            color = button['hover_color'] if button.get('hover', False) else button['color']
            pygame.draw.rect(surface, color, button['rect'])
            pygame.draw.rect(surface, (200, 200, 200), button['rect'], 1)  # Border

            # Draw text
            text = self.font.render(button['text'], True, (255, 255, 255))
            text_rect = text.get_rect(center=button['rect'].center)
            surface.blit(text, text_rect)

        # Draw status info
        status_text = "3D Mesh Editor - Press G for move mode, S for scale mode, ESC to cancel"
        text = self.font.render(status_text, True, (200, 200, 200))
        surface.blit(text, (10, surface.get_height() - 30))

        # Draw mode info
        from pygame.rect import Rect
        status_bg = Rect(10, surface.get_height() - 60, 300, 25)
        pygame.draw.rect(surface, (40, 40, 50), status_bg)
        pygame.draw.rect(surface, (80, 80, 100), status_bg, 1)

        selection_text = "Mode: Object | Use arrow keys or mouse to manipulate objects"
        text = self.font.render(selection_text, True, (200, 200, 200))
        surface.blit(text, (15, surface.get_height() - 55))