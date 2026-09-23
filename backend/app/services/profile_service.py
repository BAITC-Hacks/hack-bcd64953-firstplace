from app.exceptions import APIError, conflict
from app.repositories.profiles import ProfilesRepository
from app.schemas.profile import CurrentUser, Profile, ProfileUpdate


class ProfileService:
    def __init__(self, repository: ProfilesRepository) -> None:
        self.repository = repository

    def current(self, user: CurrentUser) -> Profile:
        row = self.repository.by_user(str(user.id))
        if row is None:
            raise APIError(403, "profile_required", "Сначала заполните профиль через PUT /profile.")
        return Profile.model_validate(row)

    def save(self, user: CurrentUser, payload: ProfileUpdate) -> Profile:
        existing = self.repository.by_user(str(user.id))
        role = existing["role"] if existing else payload.role
        if not role:
            raise APIError(422, "role_required", "Выберите роль при создании профиля.")
        if payload.role and payload.role != role:
            raise conflict("Роль существующего профиля менять нельзя.")
        if (role == "business" and payload.student) or (role == "student" and payload.business):
            raise APIError(422, "invalid_profile", "Данные не соответствуют роли профиля.")
        return Profile.model_validate(
            self.repository.save(
                {
                    "p_user_id": str(user.id),
                    "p_email": user.email,
                    "p_role": role,
                    "p_data": payload.model_dump(mode="json", exclude_unset=True),
                }
            )
        )
