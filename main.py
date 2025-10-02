import argparse
import os
import sys
from core.engine import Engine


def main(argv=None):
    """Entry point that launches either the desktop or mobile experience."""
    args = _parse_args(sys.argv[1:] if argv is None else argv)

    # Initialize the core engine
    engine = Engine()
    engine.initialize()  # Initialize with default objects

    # Detect platform and launch appropriate UI
    use_mobile = args.mobile or is_mobile()

    if use_mobile:
        # Lazy import so we do not require the pygame dependency when using the
        # mobile web experience.
        try:
            from ui.mobile.mobile_app import MobileApp
        except RuntimeError as exc:
            print(exc)
            return 1
        app = MobileApp(engine, host=args.host, port=args.port)
    else:
        from ui.desktop.desktop_app import DesktopApp
        app = DesktopApp(engine)

    app.run()
    return 0


def _parse_args(argv):
    parser = argparse.ArgumentParser(description="Launch the mesh editor.")
    parser.add_argument(
        "--mobile",
        action="store_true",
        help="Start the Flask-based mobile viewer instead of the desktop app.",
    )
    parser.add_argument(
        "--host",
        default=None,
        help="Hostname or IP address for the mobile server (defaults to 0.0.0.0).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port for the mobile server (defaults to 5000).",
    )
    return parser.parse_args(argv)


def is_mobile():
    """Determine whether to launch the mobile experience."""
    if os.environ.get("MESH_EDITOR_FORCE_MOBILE", "").lower() in {"1", "true", "yes"}:
        return True
    return "ANDROID_STORAGE" in os.environ


if __name__ == "__main__":
    raise SystemExit(main())
