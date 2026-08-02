import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from livekit.api import AccessToken, VideoGrants
import os

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        room = params.get("room", ["interview-room"])[0]
        identity = params.get("identity", ["user"])[0]
        topic = params.get("topic", ["General Software Engineering"])[0]

        LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
        LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")
        LIVEKIT_URL = os.environ.get("VITE_LIVEKIT_URL") or os.environ.get("LIVEKIT_URL")

        if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
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
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"token": jwt_token, "url": LIVEKIT_URL}).encode())
