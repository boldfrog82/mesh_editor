import os
import sys
from core.engine import Engine
from ui.desktop.desktop_app import DesktopApp
from ui.mobile.mobile_app import MobileApp


def main():
    # Initialize the core engine
    engine = Engine()
    engine.initialize()  # Initialize with default objects

    # Detect platform and launch appropriate UI
    if is_mobile():
        app = MobileApp(engine)
    else:
        app = DesktopApp(engine)

    app.run()


def is_mobile():
    # Simple platform detection - can be enhanced
    return 'ANDROID_STORAGE' in os.environ


if __name__ == "__main__":
    main()