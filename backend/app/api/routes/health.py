from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness probe; does not imply external services are configured."""
    return {"status": "ok", "service": "ai-sana-backend"}
