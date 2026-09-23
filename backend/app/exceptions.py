from typing import Any


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def not_found() -> APIError:
    return APIError(404, "not_found", "Объект не найден.")


def conflict(message: str) -> APIError:
    return APIError(409, "conflict", message)
