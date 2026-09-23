from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.exceptions import APIError
from app.middleware.error_handler import error_response


class BodyLimitMiddleware:
    """Bound incoming bytes before multipart parsing, including chunked requests."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                response = error_response(
                    Request(scope),
                    APIError(
                        413,
                        "request_too_large",
                        "Превышен допустимый размер запроса.",
                    ),
                )
                await response(scope, receive, send)
                return
            if not message.get("more_body", False):
                break
        consumed = False

        async def replay() -> Message:
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
