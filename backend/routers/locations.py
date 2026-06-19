"""Location knowledge base CRUD — allows browsing and managing location descriptions."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.parent / "data"
LOCATIONS_PATH = DATA_DIR / "locations.json"


def _load() -> dict:
    if LOCATIONS_PATH.exists():
        return json.loads(LOCATIONS_PATH.read_text())
    return {}


def _save(data: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOCATIONS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))


router = APIRouter(prefix="/api/locations", tags=["Locations"])


class LocationData(BaseModel):
    keywords: list[str]
    description: str
    vibe: str = ""
    best_times: list[str] = []
    textures: list[str] = []
    anti_tourism_description: str = ""


@router.get("")
async def list_locations():
    """List all known locations grouped by country."""
    return _load()


@router.get("/{country}/{place}")
async def get_location(country: str, place: str):
    """Get a specific location's data."""
    data = _load()
    if country in data and place in data[country]:
        return {place: data[country][place]}
    raise HTTPException(status_code=404, detail="Location not found")


@router.put("/{country}/{place}")
async def upsert_location(country: str, place: str, data: LocationData):
    """Add or update a location."""
    all_data = _load()
    if country not in all_data:
        all_data[country] = {}
    all_data[country][place] = {
        "keywords": data.keywords,
        "description": data.description,
        "vibe": data.vibe,
        "best_times": data.best_times,
        "textures": data.textures,
        "anti_tourism_description": data.anti_tourism_description,
    }
    _save(all_data)
    return {"ok": True, "country": country, "place": place}


@router.delete("/{country}/{place}")
async def delete_location(country: str, place: str):
    """Delete a location."""
    all_data = _load()
    if country in all_data and place in all_data[country]:
        del all_data[country][place]
        if not all_data[country]:
            del all_data[country]
        _save(all_data)
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Location not found")
