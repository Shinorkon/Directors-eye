"""SQLite database layer for project persistence on VPS."""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

# Database path — configurable via env, default to backend/data/
DB_DIR = Path(os.getenv("DB_DIR", Path(__file__).parent.parent / "data"))
DB_PATH = DB_DIR / "directors_eye.db"


def get_db() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_db()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                scriptment_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                shot_count INTEGER DEFAULT 0,
                completed_shots INTEGER DEFAULT 0,
                hero_frame TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS gear (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                profile_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.commit()
        print(f"[DB] Initialized at {DB_PATH}")
    finally:
        conn.close()


# ─── Project CRUD ─────────────────────────────────────────────────


def list_projects() -> list[dict]:
    """Get all projects, ordered by most recent first."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, title, created_at, updated_at, shot_count, completed_shots, hero_frame "
            "FROM projects ORDER BY updated_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_project(project_id: str) -> Optional[dict]:
    """Get a single project with full scriptment data."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["scriptment"] = json.loads(result.pop("scriptment_json"))
        return result
    finally:
        conn.close()


def save_project(project: dict) -> dict:
    """Create a new project. Returns the saved project."""
    now = datetime.utcnow().isoformat()
    scriptment = project.get("scriptment", {})
    acts = scriptment.get("acts", [])
    shot_count = sum(len(a.get("beats", [])) for a in acts)

    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO projects (id, title, scriptment_json, created_at, updated_at, shot_count, completed_shots, hero_frame)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                project["id"],
                scriptment.get("title", "Untitled"),
                json.dumps(scriptment),
                now,
                now,
                shot_count,
                0,
                project.get("hero_frame", ""),
            ),
        )
        conn.commit()
        return {
            "id": project["id"],
            "title": scriptment.get("title", "Untitled"),
            "created_at": now,
            "updated_at": now,
            "shot_count": shot_count,
            "completed_shots": 0,
            "hero_frame": project.get("hero_frame", ""),
        }
    except sqlite3.IntegrityError:
        # Project with this ID already exists — update instead
        return update_project(project["id"], project)
    finally:
        conn.close()


def update_project(project_id: str, updates: dict) -> Optional[dict]:
    """Update an existing project."""
    now = datetime.utcnow().isoformat()

    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if existing is None:
            return None

        title = updates.get("title") or json.loads(existing["scriptment_json"]).get("title", "Untitled")
        scriptment_json = json.dumps(updates.get("scriptment", json.loads(existing["scriptment_json"])))
        hero_frame = updates.get("hero_frame", existing["hero_frame"])
        completed_shots = updates.get("completed_shots", existing["completed_shots"])

        # Recalculate shot count
        scriptment = json.loads(scriptment_json)
        acts = scriptment.get("acts", [])
        shot_count = sum(len(a.get("beats", [])) for a in acts)

        conn.execute(
            """UPDATE projects SET title=?, scriptment_json=?, updated_at=?, shot_count=?, completed_shots=?, hero_frame=?
               WHERE id=?""",
            (title, scriptment_json, now, shot_count, completed_shots, hero_frame, project_id),
        )
        conn.commit()
        return {
            "id": project_id,
            "title": title,
            "scriptment": scriptment,
            "updated_at": now,
            "shot_count": shot_count,
            "completed_shots": completed_shots,
            "hero_frame": hero_frame,
        }
    finally:
        conn.close()


def delete_project(project_id: str) -> bool:
    """Delete a project. Returns True if deleted."""
    conn = get_db()
    try:
        cursor = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ─── Settings ─────────────────────────────────────────────────────


def get_settings() -> dict:
    """Get all settings as a flat dict."""
    conn = get_db()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {r["key"]: json.loads(r["value"]) for r in rows}
    finally:
        conn.close()


def save_setting(key: str, value) -> dict:
    """Save a single setting."""
    now = datetime.utcnow().isoformat()
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
            (key, json.dumps(value), now),
        )
        conn.commit()
        return {"key": key, "value": value, "updated_at": now}
    finally:
        conn.close()


# ─── Gear ─────────────────────────────────────────────────────────


def get_gear() -> Optional[dict]:
    """Get the gear profile."""
    conn = get_db()
    try:
        row = conn.execute("SELECT profile_json FROM gear WHERE id = 1").fetchone()
        if row is None:
            return None
        result = json.loads(row["profile_json"])
        return result
    finally:
        conn.close()


def save_gear(profile: dict) -> dict:
    """Save the gear profile."""
    now = datetime.utcnow().isoformat()
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO gear (id, profile_json, updated_at) VALUES (1, ?, ?)
               ON CONFLICT(id) DO UPDATE SET profile_json=excluded.profile_json, updated_at=excluded.updated_at""",
            (json.dumps(profile), now),
        )
        conn.commit()
        return {"profile": profile, "updated_at": now}
    finally:
        conn.close()
