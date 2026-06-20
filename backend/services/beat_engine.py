"""Beat template engine — pre-generates narrative structure so the LLM only writes descriptions.

Based on Reagan et al.'s six fundamental emotional arcs (Springer, 2016)
and the Save the Cat 40-beat structure (Blake Snyder / Noam Kroll).
"""

import random
import math
from enum import Enum
from typing import List, Optional, Tuple


class ShotType(str, Enum):
    ESTABLISHING = "Establishing"
    WIDE = "Wide"
    MEDIUM = "Medium"
    CLOSE_UP = "Close-up"
    ECU = "ECU"
    POV = "POV"
    AERIAL = "Aerial"

    @classmethod
    def list(cls) -> List["ShotType"]:
        return [cls.ESTABLISHING, cls.WIDE, cls.MEDIUM, cls.CLOSE_UP, cls.ECU, cls.POV, cls.AERIAL]


class EmotionalArc(str, Enum):
    RAGS_TO_RICHES = "rags_to_riches"   # Steady rise
    TRAGEDY = "tragedy"                  # Steady fall
    MAN_IN_A_HOLE = "man_in_a_hole"     # Fall → Rise
    ICARUS = "icarus"                   # Rise → Fall
    CINDERELLA = "cinderella"           # Rise → Fall → Rise
    OEDIPUS = "oedipus"                 # Fall → Rise → Fall


# Emotional valence curves (7 points: Act I start→end, Act IIa, Midpoint, Act IIb, Act III start→Finale)
# 0.0 = most negative, 1.0 = most positive
ARC_CURVES = {
    EmotionalArc.RAGS_TO_RICHES: [0.20, 0.30, 0.40, 0.50, 0.60, 0.75, 0.85],
    EmotionalArc.TRAGEDY:        [0.80, 0.70, 0.60, 0.50, 0.40, 0.25, 0.15],
    EmotionalArc.MAN_IN_A_HOLE:  [0.70, 0.50, 0.30, 0.20, 0.40, 0.60, 0.80],
    EmotionalArc.ICARUS:         [0.30, 0.50, 0.70, 0.80, 0.60, 0.40, 0.20],
    EmotionalArc.CINDERELLA:     [0.20, 0.40, 0.60, 0.40, 0.30, 0.55, 0.85],
    EmotionalArc.OEDIPUS:        [0.70, 0.50, 0.30, 0.50, 0.70, 0.45, 0.20],
}

# Narrative functions for each beat position (scaled to beat count)
SAVE_THE_CAT_FUNCTIONS = [
    "opening_image", "theme_stated", "setup",
    "catalyst", "debate",
    "break_into_two", "b_story",
    "promise_of_premise", "promise_of_premise", "promise_of_premise",
    "midpoint",
    "bad_guys_close_in", "bad_guys_close_in",
    "all_is_lost", "dark_night_of_soul",
    "break_into_three",
    "finale", "finale", "finale",
    "resolution", "final_image",
]

# Map emotional valence ranges to tone labels
VALENCE_TO_TONE = [
    (0.0, 0.15, "Melancholy"),
    (0.15, 0.30, "Tense"),
    (0.30, 0.45, "Contemplative"),
    (0.45, 0.55, "Peaceful"),
    (0.55, 0.70, "Hopeful"),
    (0.70, 0.85, "Joyful"),
    (0.85, 1.0, "Transcendent"),
]

# Which lenses pair with which shot types
LENS_FOR_SHOT = {
    ShotType.ESTABLISHING: "33mm",
    ShotType.WIDE: "33mm",
    ShotType.MEDIUM: "33mm",
    ShotType.CLOSE_UP: "55mm",
    ShotType.ECU: "55mm",
    ShotType.POV: "Find X9",
    ShotType.AERIAL: "Find X9",
}


def valence_to_tone(valence: float) -> str:
    """Map a 0-1 emotional valence to a named tone."""
    for low, high, tone in VALENCE_TO_TONE:
        if low <= valence <= high:
            return tone
    return "Contemplative"


class GeneratedBeat:
    """A single beat with all structure pre-determined. Only description comes from LLM."""
    def __init__(
        self,
        beat_number: int,
        act_number: int,
        act_title: str,
        narrative_function: str,
        shot_type: ShotType,
        emotional_tone: str,
        emotional_valence: float,
        recommended_lens: str,
        description: str = "",
        motivation: str = "",
    ):
        self.beat_number = beat_number
        self.act_number = act_number
        self.act_title = act_title
        self.narrative_function = narrative_function
        self.shot_type = shot_type
        self.emotional_tone = emotional_tone
        self.emotional_valence = emotional_valence
        self.recommended_lens = recommended_lens
        self.description = description
        self.motivation = motivation

    def to_dict(self) -> dict:
        return {
            "beatNumber": self.beat_number,
            "description": self.description,
            "motivation": self.motivation,
            "shotType": self.shot_type.value,
            "emotionalTone": self.emotional_tone,
            "recommendedLens": self.recommended_lens,
        }


class BeatTemplateEngine:
    """Generates complete narrative structures. LLM fills in descriptions only."""

    # Shot-type rotation pools weighted by act
    ACT_SHOT_POOLS = {
        1: [ShotType.ESTABLISHING, ShotType.WIDE, ShotType.MEDIUM,
            ShotType.WIDE, ShotType.MEDIUM, ShotType.CLOSE_UP],
        2: [ShotType.MEDIUM, ShotType.CLOSE_UP, ShotType.POV,
            ShotType.WIDE, ShotType.CLOSE_UP, ShotType.ECU,
            ShotType.MEDIUM, ShotType.POV, ShotType.AERIAL],
        3: [ShotType.CLOSE_UP, ShotType.ECU, ShotType.WIDE,
            ShotType.MEDIUM, ShotType.POV, ShotType.AERIAL],
    }

    def __init__(self, arc: EmotionalArc = None, beat_count: int = 7):
        self.arc = arc or random.choice(list(EmotionalArc))
        self.beat_count = max(5, min(8, beat_count))  # 5-8 beats
        self.curve = ARC_CURVES[self.arc]
        self._used_shots: List[ShotType] = []

    def _interpolate_valence(self, position: int) -> float:
        """Map beat position to emotional valence along the arc curve."""
        if self.beat_count <= 1:
            return 0.5
        ratio = position / (self.beat_count - 1)
        curve_idx = ratio * (len(self.curve) - 1)
        lower = int(curve_idx)
        upper = min(lower + 1, len(self.curve) - 1)
        fraction = curve_idx - lower
        base = self.curve[lower] + (self.curve[upper] - self.curve[lower]) * fraction
        # Add ±10% variation for organic feel
        variation = random.uniform(-0.10, 0.10)
        return max(0.0, min(1.0, base + variation))

    def _pick_shot_type(self, act_number: int, valence: float) -> ShotType:
        """Pick next shot type ensuring variety and act-appropriate choices."""
        pool = self.ACT_SHOT_POOLS.get(act_number, self.ACT_SHOT_POOLS[2])

        # Exclude recently used shots (last 2) to avoid consecutive repeats
        available = [s for s in pool if s not in self._used_shots[-2:]]
        if not available:
            available = pool

        # Weight toward tighter shots for emotional extremes
        intensity = abs(valence - 0.5) * 2  # 0 to 1
        shot_list = ShotType.list()
        weights = []
        for shot in available:
            shot_idx = shot_list.index(shot) if shot in shot_list else 3
            closeness = shot_idx / max(len(shot_list) - 1, 1)
            # Favor close shots for high intensity, wide shots for calm
            weight = 1.0 - abs(closeness - intensity)
            weights.append(max(0.1, weight))

        selected = random.choices(available, weights=weights, k=1)[0]
        self._used_shots.append(selected)
        if len(self._used_shots) > 4:
            self._used_shots.pop(0)
        return selected

    def _get_act_info(self, beat_index: int, concept_hint: str = "") -> Tuple[int, str]:
        """Determine which act a beat belongs to. Uses concept hint for smarter titles."""
        # Recalculate act boundaries based on beat count
        act1_end = max(1, self.beat_count // 3)
        act2_end = max(act1_end + 1, self.beat_count - act1_end)
        act_boundaries = [
            (1, 0, act1_end),
            (2, act1_end, act2_end),
            (3, act2_end, self.beat_count),
        ]
        for act_num, start, end in act_boundaries:
            if start <= beat_index < end:
                # Derive smarter act titles from emotional arc shape
                arc_titles = {
                    EmotionalArc.RAGS_TO_RICHES: {1: "The Hardship", 2: "The Climb", 3: "The Triumph"},
                    EmotionalArc.TRAGEDY: {1: "The Good Days", 2: "The Unraveling", 3: "The Fall"},
                    EmotionalArc.MAN_IN_A_HOLE: {1: "The Fall", 2: "The Abyss", 3: "The Redemption"},
                    EmotionalArc.ICARUS: {1: "The Ascent", 2: "The Peak", 3: "The Crash"},
                    EmotionalArc.CINDERELLA: {1: "The Longing", 2: "The Loss", 3: "The Return"},
                    EmotionalArc.OEDIPUS: {1: "The Fall", 2: "The False Hope", 3: "The Reckoning"},
                }
                titles = arc_titles.get(self.arc, {1: "The Setup", 2: "The Confrontation", 3: "The Resolution"})
                return act_num, titles.get(act_num, f"Act {act_num}")
        return 1, "The Opening"

    def _get_narrative_function(self, beat_index: int) -> str:
        """Get the Save the Cat narrative function for this beat position."""
        idx = min(
            int(beat_index / max(self.beat_count - 1, 1) * (len(SAVE_THE_CAT_FUNCTIONS) - 1)),
            len(SAVE_THE_CAT_FUNCTIONS) - 1,
        )
        return SAVE_THE_CAT_FUNCTIONS[idx]

    def _generate_default_description(self, beat: GeneratedBeat) -> str:
        """Generate a basic description template — the LLM will replace this."""
        lens_word = {
            "33mm": "wide storytelling lens",
            "55mm": "intimate portrait lens",
            "Find X9": "smartphone wide lens",
        }
        return (
            f"[{beat.shot_type.value} shot with {lens_word.get(beat.recommended_lens, 'cinematic lens')}] "
        )

    def generate_template(self, concept_hint: str = "") -> List[GeneratedBeat]:
        """Generate the full beat template. Structure only — descriptions from LLM."""
        beats = []
        for i in range(self.beat_count):
            act_num, act_title = self._get_act_info(i, concept_hint)
            valence = self._interpolate_valence(i)
            tone = valence_to_tone(valence)
            shot_type = self._pick_shot_type(act_num, valence)
            lens = LENS_FOR_SHOT[shot_type]
            narrative_func = self._get_narrative_function(i)

            beat = GeneratedBeat(
                beat_number=i + 1,
                act_number=act_num,
                act_title=act_title,
                narrative_function=narrative_func,
                shot_type=shot_type,
                emotional_tone=tone,
                emotional_valence=valence,
                recommended_lens=lens,
            )
            beat.description = self._generate_default_description(beat)
            beats.append(beat)
        return beats

    def to_scriptment_dict(self, beats: List[GeneratedBeat], title: str = "Untitled") -> dict:
        """Convert GeneratedBeats into the standard Scriptment JSON format."""
        acts = {}
        for beat in beats:
            if beat.act_number not in acts:
                acts[beat.act_number] = {
                    "actNumber": beat.act_number,
                    "title": beat.act_title,
                    "beats": [],
                }
            acts[beat.act_number]["beats"].append(beat.to_dict())

        return {
            "title": title,
            "acts": [acts[k] for k in sorted(acts)],
        }

    def build_llm_prompt(self, beats: List[GeneratedBeat], concept: str, original_concept: str = "") -> str:
        """Build a minimal prompt: LLM only writes descriptions, no structure rules needed."""
        beats_json = []
        for b in beats:
            beats_json.append({
                "beatNumber": b.beat_number,
                "actNumber": b.act_number,
                "actTitle": b.act_title,
                "narrativeFunction": b.narrative_function,
                "shotType": b.shot_type.value,
                "emotionalTone": b.emotional_tone,
                "recommendedLens": b.recommended_lens,
            })

        primary = original_concept or concept

        import json
        return f"""You are a film director writing visual descriptions for a scriptment.

**User's original concept (YOUR PRIMARY ANCHOR):** {primary}
{"**Enrichment context (time/mood/location hints only — do NOT let these override the original concept):** " + concept if concept != primary else ""}

Below is the pre-planned structure. For each beat, write:
1. "description": One vivid sentence describing what the audience sees.
2. "motivation": One sentence explaining why this shot matters emotionally.

Respond ONLY with a JSON object in this exact structure:
{{
  "beats": [
    {{
      "beatNumber": 1,
      "description": "One vivid visual sentence...",
      "motivation": "One sentence of emotional/story intent..."
    }},
    ...
  ]
}}

BEATS TO FILL:
{json.dumps(beats_json, indent=2)}

RULES:
- CRITICAL: EVERY description MUST explicitly depict the user's ORIGINAL concept: "{primary}". Do NOT write generic cinematic scenes, industrial landscapes, harbors, construction sites, or unrelated subjects. Each beat must be about: {primary}
- The enrichment context (time of day, mood, location) is supplementary — the original concept is your anchor
- Descriptions must be VISUAL — what the camera sees, not what characters think
- Each description should be 1 sentence, ~15-25 words
- Motivations should reference cinematic storytelling principles
- The emotional tone, shot type, and narrative function are already set — write descriptions that match them
- The narrative function tells you what story purpose each beat serves (e.g., "opening_image" introduces the world, "midpoint" is the turning point)
- Total runtime should feel like 30-90 seconds across all beats
- If the concept is simple b-roll (no protagonist or plot), focus purely on visual variety of the subject matter rather than inventing a narrative

Respond ONLY with the JSON object. No markdown, no code blocks, no explanations."""


def get_beat_engine(arc: Optional[EmotionalArc] = None) -> BeatTemplateEngine:
    return BeatTemplateEngine(arc=arc)
