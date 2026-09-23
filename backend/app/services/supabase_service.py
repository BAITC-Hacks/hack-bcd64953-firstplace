from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import httpx
from postgrest.exceptions import APIError as PostgrestError

from app.config import Settings
from app.exceptions import APIError, conflict, not_found
from supabase import Client, ClientOptions, create_client


def create_supabase(settings: Settings) -> Client:
    key = settings.supabase_service_role_key.get_secret_value()
    if not settings.supabase_url or not key:
        raise APIError(503, "database_unavailable", "Supabase ещё не настроен.")
    return create_client(
        settings.supabase_url,
        key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            postgrest_client_timeout=15,
            storage_client_timeout=20,
        ),
    )


@contextmanager
def database_errors() -> Iterator[None]:
    try:
        yield
    except PostgrestError as exc:
        if exc.code == "23505":
            raise conflict("Такая запись уже существует.") from exc
        if exc.code == "P0002":
            raise not_found() from exc
        if exc.code == "42501":
            raise APIError(403, "forbidden", "Недостаточно прав.") from exc
        if exc.code in {"23514", "P0001", "40001"}:
            raise conflict(
                "Состояние изменилось или действие недоступно. Обновите данные."
            ) from exc
        raise APIError(503, "database_unavailable", "База данных временно недоступна.") from exc
    except httpx.HTTPError as exc:
        raise APIError(503, "database_unavailable", "База данных временно недоступна.") from exc


def as_row(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise APIError(503, "database_invalid_response", "Некорректный ответ базы данных.")
    return {str(key): item for key, item in value.items()}


class Repository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def rpc(self, name: str, params: dict[str, Any]) -> Any:
        with database_errors():
            return self.client.rpc(name, params).execute().data

    def get(self, table: str, row_id: str) -> dict[str, Any]:
        with database_errors():
            data = self.client.table(table).select("*").eq("id", row_id).limit(1).execute().data
        if not data:
            raise not_found()
        return as_row(data[0])

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        with database_errors():
            return as_row(self.client.table(table).insert(data).execute().data[0])
