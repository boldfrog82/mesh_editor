import pygame


class DesktopUIManager:
    def __init__(self):
        self.buttons = []
        self.labels = []
        self.active_panel = None
        self.font = None
        self.initialized = False

    def init(self):
        """Initialize UI resources"""
        if not self.initialized:
            pygame.font.init()
            self.font = pygame.font.SysFont('Arial', 14)
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

        # Add Cube button
        self.buttons.append({
            'rect': pygame.Rect(margin, margin + button_height + margin, button_width, button_height),
            'text': 'Add Cube',
            'action': 'add_cube',
            'color': (100, 100, 200),
            'hover_color': (150, 150, 220)
        })

        # Add Sphere button
        self.buttons.append({
            'rect': pygame.Rect(margin + button_width + margin, margin + button_height + margin, button_width,
                                button_height),
            'text': 'Add Sphere',
            'action': 'add_sphere',
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

    def _handle_button_action(self, action):
        """Handle button actions"""
        print(f"Button action: {action}")

        # This would be connected to the actual engine in a real implementation
        # For now, just log the action
        if action == 'select_object_mode':
            # Would set selection_mode to "object"
            pass
        elif action == 'select_vertex_mode':
            # Would set selection_mode to "vertex"
            pass
        elif action == 'add_cube':
            # Would add a new cube to the scene
            pass
        elif action == 'add_sphere':
            # Would add a new sphere to the scene
            pass

    def update(self, dt):
        """Update UI state"""
        # Check mouse hover
        mouse_pos = pygame.mouse.get_pos()
        for button in self.buttons:
            button['hover'] = button['rect'].collidepoint(mouse_pos)

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
        status_text = "3D Mesh Editor - Press 1-4 to switch modes, Alt+drag to move vertices"
        text = self.font.render(status_text, True, (200, 200, 200))
        surface.blit(text, (10, surface.get_height() - 30))

        # Draw selection info
        selection_text = "Mode: Object | Selected: None"
        text = self.font.render(selection_text, True, (200, 200, 200))
        surface.blit(text, (10, surface.get_height() - 50))