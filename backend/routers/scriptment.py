"""Scriptment generation via unified LLM API (DeepSeek / Grok / OpenAI / Gemini).

Uses the optimized pipeline: concept enrichment → beat template → LLM descriptions only → grammar validation.
~80% of generation is deterministic code, only ~20% (creative descriptions) uses the LLM.
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm import get_llm_client
from services.beat_engine import BeatTemplateEngine, EmotionalArc
from services.grammar_validator import FilmGrammarValidator
from services.concept_enricher import get_enricher
from services.shoot_scheduler import get_scheduler
from services.modes import ConstraintMode, apply_constraints, MODE_META

router = APIRouter(prefix="/api/scriptment", tags=["Scriptment"])


class ConceptRequest(BaseModel):
    concept: str
    stream: bool = False
    emotional_arc: str = ""  # Optional: override auto-detection
    mode: str = "normal"  # normal, solo_crew, minimal, guerrilla, studio
    anti_tourism: bool = False  # Strip tourism language, focus on gritty realism


class ScriptmentResponse(BaseModel):
    title: str
    acts: list


@router.post("/generate", response_model=ScriptmentResponse)
async def generate_scriptment(request: ConceptRequest):
    """Generate a Scriptment using the optimized code-first pipeline."""
    if not request.concept or len(request.concept.strip()) < 10:
        raise HTTPException(status_code=400, detail="Concept must be at least 10 characters")

    # Step 1: Enrich concept — extract keywords, infer time/mood
    enricher = get_enricher()
    enriched = enricher.enrich(request.concept, anti_tourism=request.anti_tourism)

    # Step 2: Select emotional arc — use requested or infer from mood
    if request.emotional_arc:
        try:
            arc = EmotionalArc(request.emotional_arc)
        except ValueError:
            arc = _infer_arc(enriched.mood)
    else:
        arc = _infer_arc(enriched.mood)

    # Step 3: Generate beat template — entirely deterministic code, no AI
    engine = BeatTemplateEngine(arc=arc)
    beats = engine.generate_template()

    # Step 3b: Apply constraint mode — code, not AI
    try:
        mode = ConstraintMode(request.mode)
    except ValueError:
        mode = ConstraintMode.NORMAL
    beats = apply_constraints(beats, mode)

    # Step 4: LLM writes descriptions only (the creative part)
    client = get_llm_client()
    try:
        beats = await client.generate_descriptions_only(beats, enriched.expanded, enriched.original)
    except Exception as e:
        # If LLM fails, still return the structured scriptment with template descriptions
        # This means generation works even without API keys for structure
        print(f"[Scriptment] LLM descriptions failed, using templates: {e}")

    # Step 5: Validate and auto-fix grammar
    validator = FilmGrammarValidator(engine)
    beats, issues = validator.validate_and_fix(beats, original_concept=enriched.original)

    # Step 5b: Retry with reinforced prompt if concept relevance is critically low
    if validator.needs_llm_retry():
        print(f"[Scriptment] Concept relevance critical — retrying with reinforced prompt")
        try:
            # Use the same expanded concept as the first call, but pass original as anchor
            beats = await client.generate_descriptions_only(beats, enriched.expanded, enriched.original)
            # Re-validate
            validator2 = FilmGrammarValidator(engine)
            beats, issues2 = validator2.validate_and_fix(beats, original_concept=enriched.original)
            issues = issues + issues2
        except Exception as e:
            print(f"[Scriptment] Retry also failed: {e}")

    # Step 6: Assemble final response
    scriptment = engine.to_scriptment_dict(beats, title=enriched.original)

    # Add enrichment metadata and corrections
    result = {
        **scriptment,
        "_meta": {
            "emotional_arc": arc.value,
            "mode": mode.value,
            "anti_tourism": request.anti_tourism,
            "enriched_concept": enriched.to_dict(),
            "corrections": [i.to_dict() for i in issues],
            "from_cache": False,
        }
    }

    return ScriptmentResponse(**result)


@router.post("/generate/stream")
async def stream_scriptment(request: ConceptRequest):
    """Stream Scriptment generation tokens."""
    from fastapi.responses import StreamingResponse

    client = get_llm_client()

    async def token_stream():
        yield json.dumps({"step": "enriching", "mode": request.mode, "anti_tourism": request.anti_tourism}) + "\n"

        enricher = get_enricher()
        enriched = enricher.enrich(request.concept, anti_tourism=request.anti_tourism)
        yield json.dumps({"step": "structuring", "concept": enriched.to_dict()}) + "\n"

        arc = _infer_arc(enriched.mood)
        engine = BeatTemplateEngine(arc=arc)
        beats = engine.generate_template()
        
        # Apply constraint mode
        try:
            mode = ConstraintMode(request.mode)
        except ValueError:
            mode = ConstraintMode.NORMAL
        beats = apply_constraints(beats, mode)
        
        yield json.dumps({"step": "generating_descriptions", "beat_count": len(beats), "mode": mode.value}) + "\n"

        try:
            beats = await client.generate_descriptions_only(beats, enriched.expanded, enriched.original)
        except Exception as e:
            yield json.dumps({"step": "warning", "message": str(e)}) + "\n"

        validator = FilmGrammarValidator(engine)
        beats, issues = validator.validate_and_fix(beats, original_concept=enriched.original)
        scriptment = engine.to_scriptment_dict(beats, title=enriched.original)

        yield json.dumps({"step": "complete", "scriptment": scriptment, "corrections": [i.to_dict() for i in issues]}) + "\n"

    return StreamingResponse(token_stream(), media_type="application/x-ndjson")


def _infer_arc(mood: str) -> EmotionalArc:
    """Infer the best emotional arc from the detected mood."""
    mood_arc_map = {
        "hopeful": EmotionalArc.RAGS_TO_RICHES,
        "joyful": EmotionalArc.RAGS_TO_RICHES,
        "melancholy": EmotionalArc.MAN_IN_A_HOLE,
        "tense": EmotionalArc.ICARUS,
        "contemplative": EmotionalArc.CINDERELLA,
        "awe": EmotionalArc.CINDERELLA,
        "intimate": EmotionalArc.CINDERELLA,
    }
    return mood_arc_map.get(mood or "", EmotionalArc.CINDERELLA)

