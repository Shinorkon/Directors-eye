"""Constraint modes for Director's Eye — all logic, no AI cost.

Each mode constrains the beat template in specific ways:
- SOLO_CREW: 2 people max, one lens, available light, no complex moves
- MINIMAL: 5 locations max, natural light only, no gimbal/dolly
- GUERRILLA: street photography style, single prime, handheld, stealth
- STUDIO: controlled environment, artificial light only, tripod-heavy

The LLM prompt doesn't change — these constraints are applied to the
beat template post-generation, before sending to the LLM for descriptions.
This means fewer beats = shorter prompts = cheaper generations.
"""

from enum import Enum
from typing import List
from services.beat_engine import GeneratedBeat, ShotType


class ConstraintMode(str, Enum):
    NORMAL = "normal"
    SOLO_CREW = "solo_crew"
    MINIMAL = "minimal"
    GUERRILLA = "guerrilla"
    STUDIO = "studio"


MODE_META = {
    ConstraintMode.NORMAL: {
        "label": "Normal",
        "icon": "🎬",
        "description": "Full creative freedom",
        "max_beats": 8,
        "token_savings": "0%",
    },
    ConstraintMode.SOLO_CREW: {
        "label": "Solo Crew",
        "icon": "🎒",
        "description": "You + one helper, one lens, available light",
        "max_beats": 5,
        "token_savings": "~37%",
    },
    ConstraintMode.MINIMAL: {
        "label": "Minimal",
        "icon": "📦",
        "description": "5 locations, natural light, no gimbal or dolly",
        "max_beats": 6,
        "token_savings": "~25%",
    },
    ConstraintMode.GUERRILLA: {
        "label": "Guerrilla",
        "icon": "🏃",
        "description": "Single 33mm prime, handheld, available light, stealth run",
        "max_beats": 5,
        "token_savings": "~37%",
    },
    ConstraintMode.STUDIO: {
        "label": "Studio",
        "icon": "💡",
        "description": "Controlled interior, tripod, artificial light",
        "max_beats": 7,
        "token_savings": "~12%",
    },
}


def apply_constraints(beats: List[GeneratedBeat], mode: ConstraintMode) -> List[GeneratedBeat]:
    """Apply a constraint mode to a list of beats. Returns constrained beats."""
    if mode == ConstraintMode.NORMAL:
        return beats

    mode_handlers = {
        ConstraintMode.SOLO_CREW: _apply_solo_crew,
        ConstraintMode.MINIMAL: _apply_minimal,
        ConstraintMode.GUERRILLA: _apply_guerrilla,
        ConstraintMode.STUDIO: _apply_studio,
    }

    handler = mode_handlers.get(mode)
    if handler:
        return handler(beats)
    return beats


def _apply_solo_crew(beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
    """One lens (33mm), available light, no complex moves."""
    constrained = []
    for beat in beats:
        # Cap at 5 beats, take first 5
        if len(constrained) >= 5:
            break
        # Remove Aerial and POV (need drone/secondary or extra setup)
        if beat.shot_type in (ShotType.AERIAL, ShotType.POV):
            beat.shot_type = ShotType.MEDIUM
            beat.recommended_lens = "33mm"
        # Force 33mm only
        beat.recommended_lens = "33mm"
        # Add solo-crew note
        if beat.description.startswith("["):
            beat.description = "[Solo — 33mm, available light] " + beat.description.split("] ", 1)[-1] if "] " in beat.description else beat.description
        constrained.append(beat)
    return constrained


def _apply_minimal(beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
    """No gimbal/dolly, natural light only, remove complex cam movement."""
    constrained = []
    for beat in beats:
        if len(constrained) >= 6:
            break
        # Replace POV and Aerial (need extra gear or access)
        if beat.shot_type == ShotType.AERIAL:
            beat.shot_type = ShotType.WIDE
            beat.recommended_lens = "33mm"
        if beat.shot_type == ShotType.POV:
            beat.shot_type = ShotType.MEDIUM
            beat.recommended_lens = "33mm"
        constrained.append(beat)
    return constrained


def _apply_guerrilla(beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
    """Single 33mm prime, handheld, stealth, available light."""
    constrained = []
    for beat in beats:
        if len(constrained) >= 5:
            break
        # Force 33mm
        beat.recommended_lens = "33mm"
        # Replace ECU (too tight for run-and-gun) and Aerial
        if beat.shot_type == ShotType.ECU:
            beat.shot_type = ShotType.CLOSE_UP
        if beat.shot_type == ShotType.AERIAL:
            beat.shot_type = ShotType.WIDE
        if beat.shot_type == ShotType.POV:
            beat.shot_type = ShotType.WIDE
        constrained.append(beat)
    return constrained


def _apply_studio(beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
    """Interior-focused, tripod, artificial light. Remove POV and Aerial."""
    constrained = []
    for beat in beats:
        if len(constrained) >= 7:
            break
        # Remove exterior-only shot types
        if beat.shot_type == ShotType.AERIAL:
            beat.shot_type = ShotType.ESTABLISHING
        if beat.shot_type == ShotType.POV:
            beat.shot_type = ShotType.MEDIUM
        constrained.append(beat)
    return constrained
