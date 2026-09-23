from typing import Any

from app.services.supabase_service import Repository, as_row, database_errors


class ProfilesRepository(Repository):
    def by_user(self, user_id: str) -> dict[str, Any] | None:
        with database_errors():
            data = (
                self.client.table("profiles")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
                .data
            )
        return self.with_details(as_row(data[0])) if data else None

    def with_details(self, profile: dict[str, Any]) -> dict[str, Any]:
        role = profile["role"]
        with database_errors():
            data = (
                self.client.table(f"{role}_profiles")
                .select("*")
                .eq("profile_id", profile["id"])
                .limit(1)
                .execute()
                .data
            )
        if data:
            profile[role] = {
                k: v for k, v in as_row(data[0]).items() if k not in {"id", "profile_id"}
            }
        return profile

    def save(self, params: dict[str, Any]) -> dict[str, Any]:
        return dict(self.rpc("save_profile", params))
