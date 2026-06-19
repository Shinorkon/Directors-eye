"""Genre explorer — generates the same concept through all 6 emotional arcs in parallel.

This is the best demo feature: one location, 6 completely different films.
All 6 arcs run concurrently via asyncio.gather, so total time ≈ time for 1 arc.
"""

import asyncio
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm import get_llm_client
from services.beat_engine import BeatTemplateEngine, EmotionalArc
from services.grammar_validator import FilmGrammarValidator
from services.concept_enricher import get_enricher
from services.modes import ConstraintMode, apply_constraints

router = APIRouter(prefix="/api/explore", tags=["Genre Explorer"])

ARC_META = {
    EmotionalArc.RAGS_TO_RICHES: {
        "label": "Rags to Riches",
        "description": "Steady rise from hardship to triumph",
        "color": "#7BAE7F",
    },
    EmotionalArc.TRAGEDY: {
        "label": "Tragedy",
        "description": "Slow descent into loss",
        "color": "#742A2A",
    },
    EmotionalArc.MAN_IN_A_HOLE: {
        "label": "Man in a Hole",
        "description": "Fall then redemption",
        "color": "#2B6CB0",
    },
    EmotionalArc.ICARUS: {
        "label": "Icarus",
        "description": "Rise then catastrophic fall",
        "color": "#975A16",
    },
    EmotionalArc.CINDERELLA: {
        "label": "Cinderella",
        "description": "Rise, loss, then ultimate triumph",
        "color": "#6B46C1",
    },
    EmotionalArc.OEDIPUS: {
        "label": "Oedipus",
        "description": "Fall, rise, then final fall",
        "color": "#553C3C",
    },
}


class ExploreRequest(BaseModel):
    concept: str
    mode: str = "normal"
    anti_tourism: bool = False


class ExploreResponse(BaseModel):
    concept: str
    variants: list


@router.post("/genres", response_model=ExploreResponse)
async def explore_genres(request: ExploreRequest):
    """Generate the same concept through all 6 emotional arcs in parallel."""
    if not request.concept or len(request.concept.strip()) < 10:
        raise HTTPException(status_code=400, detail="Concept must be at least 10 characters")

    # Enrich concept once (shared across all arcs)
    enricher = get_enricher()
    enriched = enricher.enrich(request.concept, anti_tourism=request.anti_tourism)

    # Resolve mode
    try:
        mode = ConstraintMode(request.mode)
    except ValueError:
        mode = ConstraintMode.NORMAL

    # Run all 6 arcs in parallel
    client = get_llm_client()
    arcs = list(EmotionalArc)

    async def generate_variant(arc: EmotionalArc) -> dict:
        engine = BeatTemplateEngine(arc=arc)
        beats = engine.generate_template()
        beats = apply_constraints(beats, mode)

        try:
            beats = await client.generate_descriptions_only(beats, enriched.expanded)
        except Exception as e:
            print(f"[Explore] {arc.value} descriptions failed: {e}")

        validator = FilmGrammarValidator(engine)
        beats, issues = validator.validate_and_fix(beats)

        scriptment = engine.to_scriptment_dict(beats, title=enriched.original)
        meta = ARC_META.get(arc, {})

        # Extract a short summary from the first beat description
        summary = ""
        all_beats = beats
        if all_beats:
            first_desc = all_beats[0].description or ""
            summary = first_desc[:100] if len(first_desc) > 100 else first_desc

        return {
            "arc": arc.value,
            "label": meta.get("label", arc.value),
            "description": meta.get("description", ""),
            "color": meta.get("color", "#8A8279"),
            "beatCount": len(beats),
            "summary": summary,
            "firstBeatDescription": all_beats[0].description if all_beats else "",
            "lastBeatDescription": all_beats[-1].description if all_beats else "",
            "scriptment": scriptment,
            "corrections": [i.to_dict() for i in issues],
        }

    variants = await asyncio.gather(*[generate_variant(arc) for arc in arcs])

    return ExploreResponse(
        concept=enriched.expanded,
        variants=variants,
    )
