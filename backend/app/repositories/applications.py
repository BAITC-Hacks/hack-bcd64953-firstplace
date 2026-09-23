from typing import Any

from postgrest.types import CountMethod

from app.services.supabase_service import Repository, as_row, database_errors


class ApplicationsRepository(Repository):
    def list(
        self,
        *,
        owner_id: str | None,
        status: str | None,
        search: str,
        skill: str,
        sort: str,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        query = self.client.table("applications").select("*", count=CountMethod.exact)
        if owner_id:
            query = query.eq("business_id", owner_id)
        if status:
            query = query.eq("status", status)
        if search:
            # A single PostgREST filter; no interpolated `or(...)` expression.
            escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            query = query.ilike("title", f"%{escaped}%")
        if skill:
            query = query.contains("required_skills", [skill])
        query = query.order("created_at", desc=sort == "newest").order("id")
        with database_errors():
            result = query.range(offset, offset + limit - 1).execute()
        return [as_row(row) for row in result.data], result.count or 0

    def mutate(
        self, app_id: str, owner_id: str, revision: int, changes: dict[str, Any]
    ) -> dict[str, Any]:
        return dict(
            self.rpc(
                "mutate_application",
                {
                    "p_id": app_id,
                    "p_owner": owner_id,
                    "p_revision": revision,
                    "p_changes": changes,
                },
            )
        )

    def latest_analysis(self, app_id: str) -> dict[str, Any] | None:
        with database_errors():
            rows = (
                self.client.table("application_analyses")
                .select("*")
                .eq("application_id", app_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
            )
        return as_row(rows[0]) if rows else None
