"""Serve the static Nexus benchmark on a free localhost port and open it."""
from __future__ import annotations
import http.server
import socket
import webbrowser

class BenchmarkHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm", ".js": "text/javascript; charset=utf-8"}
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

def first_available_port(start: int = 8000, attempts: int = 100) -> int:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"No free port in {start}-{start + attempts - 1}")

def main() -> None:
    port = first_available_port()
    url = f"http://localhost:{port}"
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), BenchmarkHandler)
    print(f"Starting Nexus benchmark at {url}")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
