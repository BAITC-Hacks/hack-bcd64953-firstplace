from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import ProfileDep, UserDep, get_profile_service
from app.schemas.profile import Profile, ProfileUpdate
from app.services.profile_service import ProfileService

router = APIRouter(tags=["Profiles"])


@router.get("/profile", response_model=Profile)
def get_profile(profile: ProfileDep) -> Profile:
    return profile


@router.put("/profile", response_model=Profile)
def update_profile(
    user: UserDep,
    payload: ProfileUpdate,
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> Profile:
    """Create your profile once or update it. A saved role is immutable."""
    return service.save(user, payload)
