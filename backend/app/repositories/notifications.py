from typing import Any

from postgrest.types import CountMethod

from app.exceptions import not_found
from app.services.supabase_service import Repository, as_row, database_errors


class NotificationsRepository(Repository):
    def list(
        self, profile_id: str, unread_only: bool, limit: int, offset: int
    ) -> tuple[list[dict[str, Any]], int]:
        query = (
            self.client.table("notifications")
            .select("*", count=CountMethod.exact)
            .eq("profile_id", profile_id)
        )
        if unread_only:
            query = query.eq("is_read", False)
        with database_errors():
            result = (
                query.order("created_at", desc=True)
                .order("id")
                .range(offset, offset + limit - 1)
                .execute()
            )
        return [as_row(row) for row in result.data], result.count or 0

    def mark(self, row_id: str, profile_id: str, is_read: bool) -> dict[str, Any]:
        with database_errors():
            rows = (
                self.client.table("notifications")
                .update({"is_read": is_read})
                .eq("id", row_id)
                .eq("profile_id", profile_id)
                .execute()
                .data
            )
        if not rows:
            raise not_found()
        return as_row(rows[0])
