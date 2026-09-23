import logging
import time
from uuid import uuid4

from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("ai_sana.requests")


class RequestIDMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = str(uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        start = time.monotonic()

        async def send_with_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers[:] = [
                    (name, value) for name, value in headers if name.lower() != b"x-request-id"
                ]
                headers.append((b"x-request-id", request_id.encode()))
                logger.info(
                    "request_id=%s method=%s status=%s duration_ms=%.1f",
                    request_id,
                    scope["method"],
                    message["status"],
                    (time.monotonic() - start) * 1000,
                )
            await send(message)

        await self.app(scope, receive, send_with_id)
