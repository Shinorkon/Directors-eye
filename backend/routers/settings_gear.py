"""Settings and gear profile endpoints backed by SQLite."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.database import (
    get_settings,
    save_setting,
    get_gear,
    save_gear,
)

router = APIRouter(prefix="/api", tags=["Settings & Gear"])


class SettingsRequest(BaseModel):
    key: str
    value: bool | str | int | float | list | dict


class GearRequest(BaseModel):
    profile: dict


# ─── Settings ─────────────────────────────────────────────────────


@router.get("/settings", tags=["Settings"])
async def api_get_settings():
    """Get all settings."""
    return get_settings()


@router.put("/settings/{key}", tags=["Settings"])
async def api_save_setting(key: str, request: SettingsRequest):
    """Save a setting."""
    return save_setting(key, request.value)


# ─── Gear ─────────────────────────────────────────────────────────


@router.get("/gear", tags=["Gear"])
async def api_get_gear():
    """Get gear profile."""
    profile = get_gear()
    if profile is None:
        return {"profile": None}
    return {"profile": profile}


@router.put("/gear", tags=["Gear"])
async def api_save_gear(request: GearRequest):
    """Save gear profile."""
    return save_gear(request.profile)
