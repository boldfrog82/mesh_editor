
class MobileUIManager:
    def __init__(self):
        self.widgets = []

    def add_widget(self, widget):
        """Add a UI widget"""
        self.widgets.append(widget)

    def update(self, dt):
        """Update all widgets"""
        for widget in self.widgets:
            widget.update(dt)
