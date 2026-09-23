import logging

import httpx
from storage3.exceptions import StorageApiError

from app.config import Settings
from app.exceptions import APIError
from supabase import Client

logger = logging.getLogger("ai_sana.storage")


class StorageService:
    def __init__(self, client: Client, settings: Settings) -> None:
        self.bucket = client.storage.from_(settings.storage_bucket)

    def upload(self, path: str, data: bytes) -> None:
        try:
            self.bucket.upload(path, data, {"content-type": "text/csv", "upsert": "false"})
        except (StorageApiError, httpx.HTTPError) as exc:
            raise APIError(503, "storage_unavailable", "Не удалось сохранить CSV.") from exc

    def remove(self, path: str) -> None:
        try:
            self.bucket.remove([path])
        except StorageApiError, httpx.HTTPError:
            logger.error("storage_cleanup_failed object=%s", path)
