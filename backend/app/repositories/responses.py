from typing import Any

from postgrest.types import CountMethod

from app.services.supabase_service import Repository, as_row, database_errors


class ResponsesRepository(Repository):
    def list(
        self, profile_id: str, role: str, application_id: str | None, limit: int, offset: int
    ) -> tuple[list[dict[str, Any]], int]:
        query = self.client.table("responses").select(
            "*,applications!inner(business_id)", count=CountMethod.exact
        )
        if role == "business":
            query = query.eq("applications.business_id", profile_id)
        else:
            query = query.eq("student_id", profile_id)
        if application_id:
            query = query.eq("application_id", application_id)
        with database_errors():
            result = (
                query.order("created_at", desc=True)
                .order("id")
                .range(offset, offset + limit - 1)
                .execute()
            )
        return [as_row(row) for row in result.data], result.count or 0

    def latest_evaluation(self, upload_id: str) -> dict[str, Any] | None:
        with database_errors():
            rows = (
                self.client.table("ai_evaluations")
                .select("*")
                .eq("upload_id", upload_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
            )
        return as_row(rows[0]) if rows else None

    def team_response(self, business_id: str, student_id: str) -> dict[str, Any] | None:
        with database_errors():
            rows = (
                self.client.table("responses")
                .select("*,applications!inner(business_id)")
                .eq("student_id", student_id)
                .eq("applications.business_id", business_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
            )
        return as_row(rows[0]) if rows else None

    def team_visible(self, business_id: str, student_id: str) -> bool:
        with database_errors():
            rows = (
                self.client.table("responses")
                .select("id,applications!inner(business_id)")
                .eq("student_id", student_id)
                .eq("applications.business_id", business_id)
                .limit(1)
                .execute()
                .data
            )
        return bool(rows)
