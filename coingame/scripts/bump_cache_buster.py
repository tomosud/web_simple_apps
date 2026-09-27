"""Update the shared static-asset cache-buster after a WASM build."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
FILES = (ROOT / "index.html", ROOT / "src" / "main.js", ROOT / "src" / "renderer.js")
PATTERN = re.compile(r"v=[0-9]{8}(?:[a-z]|[0-9]{6})?")


def main() -> None:
    version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    for path in FILES:
        source = path.read_text(encoding="utf-8")
        updated, count = PATTERN.subn(f"v={version}", source)
        if count == 0:
            raise RuntimeError(f"No cache-buster found in {path}")
        path.write_text(updated, encoding="utf-8", newline="\n")
    print(f"Updated asset cache-buster to {version}")


if __name__ == "__main__":
    main()
