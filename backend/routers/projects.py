"""Project persistence endpoints backed by SQLite."""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.database import (
    init_db,
    list_projects,
    get_project,
    save_project,
    update_project,
    delete_project,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])

# Initialize DB on import
init_db()


# ─── Schemas ──────────────────────────────────────────────────────


class ScriptmentData(BaseModel):
    """The scriptment object that comes from generation."""
    id: str = ""
    title: str = ""
    createdAt: str = ""
    acts: list = []


class SaveProjectRequest(BaseModel):
    id: str = ""
    title: str = ""
    scriptment: ScriptmentData
    hero_frame: str = ""


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    scriptment: ScriptmentData | None = None
    completed_shots: int | None = None
    hero_frame: str | None = None


# ─── Project Endpoints ────────────────────────────────────────────


@router.get("")
async def api_list_projects():
    """List all saved projects."""
    return list_projects()


@router.get("/{project_id}")
async def api_get_project(project_id: str):
    """Get a single project with full scriptment data."""
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("")
async def api_save_project(request: SaveProjectRequest):
    """Save a new project."""
    project_id = request.id or uuid.uuid4().hex[:12]
    project_dict = {
        "id": project_id,
        "scriptment": request.scriptment.model_dump(),
        "hero_frame": request.hero_frame,
    }
    result = save_project(project_dict)
    return result


@router.put("/{project_id}")
async def api_update_project(project_id: str, request: UpdateProjectRequest):
    """Update an existing project."""
    updates = {}
    if request.scriptment is not None:
        updates["scriptment"] = request.scriptment.model_dump()
    if request.title is not None:
        updates["title"] = request.title
    if request.completed_shots is not None:
        updates["completed_shots"] = request.completed_shots
    if request.hero_frame is not None:
        updates["hero_frame"] = request.hero_frame

    result = update_project(project_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.delete("/{project_id}")
async def api_delete_project(project_id: str):
    """Delete a project."""
    deleted = delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}

