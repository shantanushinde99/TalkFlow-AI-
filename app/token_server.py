"""Simple HTTP server to generate LiveKit access tokens for the frontend."""
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from livekit.api import AccessToken, VideoGrants
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger("token_server")

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
PORT = 8880


class TokenHandler(BaseHTTPRequestHandler):
    """Handles GET /token?room=<room>&identity=<identity>&topic=<topic>"""

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/token", "/api/token"):
            self.send_response(404)
            self.end_headers()
            return

        params = parse_qs(parsed.query)
        room = params.get("room", ["interview-room"])[0]
        identity = params.get("identity", ["user"])[0]
        topic = params.get("topic", ["General Software Engineering"])[0]

        if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error": "LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set"}')
            return

        token = (
            AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(identity)
            .with_metadata(json.dumps({"topic": topic}))
            .with_grants(VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
            ))
        )
        jwt_token = token.to_jwt()

        self.send_response(200)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"token": jwt_token, "url": os.getenv("LIVEKIT_URL")}).encode())

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


if __name__ == "__main__":
    server = HTTPServer(("", PORT), TokenHandler)
    print(f"Token server running on http://localhost:{PORT}")
    print(f"  GET http://localhost:{PORT}/token?room=interview-room&identity=user&topic=React")
    server.serve_forever()
