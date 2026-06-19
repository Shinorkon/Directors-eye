"""Film grammar validator — post-generation enforcement of cinematic rules.

Auto-fixes common violations so the LLM never needs to re-generate.
Fix-first, retry-second philosophy: 80% of issues are corrected in code.
"""

from typing import List, Tuple
from services.beat_engine import GeneratedBeat, ShotType, LENS_FOR_SHOT, valence_to_tone, BeatTemplateEngine

ACT_BEAT_RANGES = {
    1: (0.20, 0.35),  # Act I: 20-35% of total beats
    2: (0.45, 0.55),  # Act II: 45-55%
    3: (0.20, 0.35),  # Act III: 20-35%
}


class ValidationIssue:
    def __init__(self, beat_number: int, rule: str, severity: str, message: str, fix: str = ""):
        self.beat_number = beat_number
        self.rule = rule
        self.severity = severity  # "auto_fixed", "warning", "critical"
        self.message = message
        self.fix = fix

    def to_dict(self) -> dict:
        return {
            "beatNumber": self.beat_number,
            "rule": self.rule,
            "severity": self.severity,
            "message": self.message,
            "fix": self.fix,
        }


class FilmGrammarValidator:
    """Validates and auto-fixes scriptment beats after LLM generation."""

    def __init__(self, engine: BeatTemplateEngine):
        self.engine = engine
        self.issues: List[ValidationIssue] = []

    def validate_and_fix(self, beats: List[GeneratedBeat]) -> Tuple[List[GeneratedBeat], List[ValidationIssue]]:
        """Run all validation passes. Returns (corrected_beats, issues_log)."""
        self.issues = []

        beats = self._fix_shot_variety(beats)
        beats = self._fix_lens_assignment(beats)
        beats = self._fix_emotional_tone(beats)
        beats = self._check_act_balance(beats)
        beats = self._fix_description_quality(beats)

        return beats, self.issues

    def _fix_shot_variety(self, beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """No two consecutive beats may share the same shot type."""
        beats = list(beats)
        for i in range(1, len(beats)):
            if beats[i].shot_type == beats[i - 1].shot_type:
                old_shot = beats[i].shot_type
                # Pick a different shot type from the same act's pool
                pool = BeatTemplateEngine.ACT_SHOT_POOLS.get(beats[i].act_number, [s for s in ShotType])
                available = [s for s in pool if s != beats[i - 1].shot_type and s != old_shot]
                if not available:
                    available = [s for s in ShotType if s != beats[i - 1].shot_type]
                new_shot = available[i % len(available)]
                beats[i].shot_type = new_shot
                beats[i].recommended_lens = LENS_FOR_SHOT.get(new_shot, beats[i].recommended_lens)
                self.issues.append(ValidationIssue(
                    beat_number=beats[i].beat_number,
                    rule="shot_variety",
                    severity="auto_fixed",
                    message=f"Consecutive {old_shot.value} at beat {beats[i].beat_number}",
                    fix=f"Changed to {new_shot.value}",
                ))
        return beats

    def _fix_lens_assignment(self, beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """Ensure each shot type has its correct lens."""
        beats = list(beats)
        for beat in beats:
            correct_lens = LENS_FOR_SHOT.get(beat.shot_type)
            if correct_lens and beat.recommended_lens != correct_lens:
                self.issues.append(ValidationIssue(
                    beat_number=beat.beat_number,
                    rule="lens_assignment",
                    severity="auto_fixed",
                    message=f"{beat.shot_type.value} should use {correct_lens}, had {beat.recommended_lens}",
                    fix=f"Set to {correct_lens}",
                ))
                beat.recommended_lens = correct_lens
        return beats

    def _fix_emotional_tone(self, beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """Ensure emotional tone matches the pre-planned valence."""
        beats = list(beats)
        for i, beat in enumerate(beats):
            expected_valence = self.engine._interpolate_valence(i)
            expected_tone = valence_to_tone(expected_valence)
            current_tone_valence = self._tone_to_valence(beat.emotional_tone)
            if abs(current_tone_valence - expected_valence) > 0.25:
                self.issues.append(ValidationIssue(
                    beat_number=beat.beat_number,
                    rule="emotional_tone",
                    severity="auto_fixed",
                    message=f"Tone '{beat.emotional_tone}' diverges from arc at beat {beat.beat_number}",
                    fix=f"Corrected to '{expected_tone}'",
                ))
                beat.emotional_tone = expected_tone
                beat.emotional_valence = expected_valence
        return beats

    def _check_act_balance(self, beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """Check that beats are distributed across acts within acceptable ranges."""
        total = len(beats)
        act_counts = {1: 0, 2: 0, 3: 0}
        for beat in beats:
            act_counts[beat.act_number] = act_counts.get(beat.act_number, 0) + 1

        for act_num, count in act_counts.items():
            ratio = count / total
            low, high = ACT_BEAT_RANGES.get(act_num, (0.2, 0.35))
            if not (low <= ratio <= high):
                self.issues.append(ValidationIssue(
                    beat_number=-1,
                    rule="act_balance",
                    severity="warning",
                    message=f"Act {act_num}: {ratio:.0%} beats (expected {low:.0%}-{high:.0%})",
                    fix="",
                ))
        return beats

    def _fix_description_quality(self, beats: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """Flag descriptions that are too short, still have template text, or lack detail."""
        beats = list(beats)
        for beat in beats:
            desc = beat.description or ""
            # Check for unfilled template text
            if "[" in desc and "]" in desc:
                beat.description = (
                    f"A {beat.shot_type.value.lower()} shot capturing the scene. "
                    f"The mood is {beat.emotional_tone.lower()}."
                )
                self.issues.append(ValidationIssue(
                    beat_number=beat.beat_number,
                    rule="unfilled_template",
                    severity="auto_fixed",
                    message="Description still contains template placeholder",
                    fix="Replaced with generic description",
                ))
            elif len(desc.strip()) < 20:
                beat.description = (
                    f"A {beat.shot_type.value.lower()} frame with {beat.emotional_tone.lower()} energy."
                )
                self.issues.append(ValidationIssue(
                    beat_number=beat.beat_number,
                    rule="short_description",
                    severity="auto_fixed",
                    message=f"Description too short ({len(desc.strip())} chars)",
                    fix="Expanded with shot-type default",
                ))
        return beats

    def needs_llm_retry(self) -> bool:
        """Most issues are auto-fixed. Only retry if critical issues remain."""
        return any(issue.severity == "critical" for issue in self.issues)

    @staticmethod
    def _tone_to_valence(tone: str) -> float:
        """Rough mapping from tone name to 0-1 valence."""
        mapping = {
            "Melancholy": 0.10, "Tense": 0.25, "Contemplative": 0.40,
            "Peaceful": 0.50, "Hopeful": 0.65, "Joyful": 0.80,
            "Transcendent": 0.90, "Awe": 0.75, "Intimate": 0.35,
            "Uncertain": 0.30,
        }
        return mapping.get(tone, 0.5)
