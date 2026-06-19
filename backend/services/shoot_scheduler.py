"""Smart shoot scheduler — converts narrative beats into a production-optimized shooting order.

Golden hour first, interiors during midday, minimize lens swaps between consecutive shots.
"""

from typing import List, Dict
from services.beat_engine import GeneratedBeat


# Lighting priority — golden hour is most time-sensitive
LIGHTING_PRIORITY = [
    ("golden_hour", ["golden hour", "sunset", "sunrise", "dawn", "dusk", "golden", "warm light", "magic hour"]),
    ("blue_hour", ["blue hour", "twilight", "nightfall", "pre-dawn"]),
    ("interior", ["interior", "indoor", "room", "studio", "inside", "building"]),
    ("open_shade", ["shade", "overcast", "cloudy", "soft light", "diffused"]),
    ("night", ["night", "dark", "midnight", "noir", "evening", "moon"]),
    ("flexible", []),  # Catch-all, no special lighting
]


class ScheduledShot:
    """A beat with its shooting block and order."""
    def __init__(self, beat: GeneratedBeat, block: str, block_order: int):
        self.beat = beat
        self.block = block
        self.block_order = block_order

    def to_dict(self) -> dict:
        return {
            "beatNumber": self.beat.beat_number,
            "description": self.beat.description,
            "shotType": self.beat.shot_type.value,
            "emotionalTone": self.beat.emotional_tone,
            "recommendedLens": self.beat.recommended_lens,
            "shootingBlock": self.block,
            "blockOrder": self.block_order,
        }


class ShootingBlock:
    """A block of shots grouped by lighting condition, ordered optimally."""
    def __init__(self, name: str, priority: int):
        self.name = name
        self.priority = priority
        self.shots: List[GeneratedBeat] = []

    @property
    def estimated_duration_min(self) -> int:
        return 30 + len(self.shots) * 15  # 30 min setup + 15 min per shot


class ShootScheduler:
    """Convert narrative-ordered beats into production-optimized shooting schedule."""

    def _infer_lighting(self, beat: GeneratedBeat) -> str:
        """Detect lighting condition from description and shot type."""
        desc = (beat.description or "").lower()
        for condition, keywords in LIGHTING_PRIORITY:
            if condition == "flexible":
                continue
            if any(kw in desc for kw in keywords):
                return condition

        # Default by shot type
        type_defaults = {
            "Establishing": "golden_hour",
            "Aerial": "golden_hour",
            "POV": "open_shade",
            "Wide": "open_shade",
            "Medium": "flexible",
            "Close-up": "interior",
            "ECU": "interior",
        }
        return type_defaults.get(beat.shot_type.value, "flexible")

    def _lens_change_cost(self, a: GeneratedBeat, b: GeneratedBeat) -> int:
        """Estimate time cost of switching from shot a to shot b."""
        cost = 0

        # Lens change is expensive
        if a.recommended_lens != b.recommended_lens:
            cost += 5

        # Camera support change
        support_map = {
            "Establishing": "tripod", "Wide": "tripod", "Medium": "tripod",
            "Close-up": "tripod", "ECU": "tripod", "POV": "handheld", "Aerial": "drone",
        }
        support_a = support_map.get(a.shot_type.value, "tripod")
        support_b = support_map.get(b.shot_type.value, "tripod")
        if support_a != support_b:
            cost += 3

        # Shot size jump — gradual transitions are faster
        shot_order = ["ECU", "Close-up", "Medium", "Wide", "Establishing", "POV", "Aerial"]
        idx_a = shot_order.index(a.shot_type.value) if a.shot_type.value in shot_order else 3
        idx_b = shot_order.index(b.shot_type.value) if b.shot_type.value in shot_order else 3
        cost += abs(idx_a - idx_b)

        return cost

    def _optimize_block(self, shots: List[GeneratedBeat]) -> List[GeneratedBeat]:
        """Greedy nearest-neighbor optimization within a lighting block."""
        if len(shots) <= 2:
            return shots

        ordered = [shots[0]]
        remaining = list(range(1, len(shots)))

        while remaining:
            current = ordered[-1]
            best_idx = min(remaining, key=lambda i: self._lens_change_cost(current, shots[i]))
            ordered.append(shots[best_idx])
            remaining.remove(best_idx)

        return ordered

    def create_schedule(self, beats: List[GeneratedBeat]) -> Dict:
        """Generate the optimized shooting schedule."""
        # Step 1: Group by lighting condition
        blocks: Dict[str, ShootingBlock] = {}
        for beat in beats:
            lighting = self._infer_lighting(beat)
            if lighting not in blocks:
                priority = next(
                    (i for i, (name, _) in enumerate(LIGHTING_PRIORITY) if name == lighting),
                    len(LIGHTING_PRIORITY) - 1,
                )
                blocks[lighting] = ShootingBlock(lighting, priority)
            blocks[lighting].shots.append(beat)

        # Step 2: Optimize each block's shot order
        for block in blocks.values():
            block.shots = self._optimize_block(block.shots)

        # Step 3: Sort blocks by priority
        sorted_blocks = sorted(blocks.values(), key=lambda b: b.priority)

        # Step 4: Build output
        schedule = []
        lens_switches = 0
        last_lens = None

        for block in sorted_blocks:
            block_shots = []
            for i, shot in enumerate(block.shots):
                if last_lens and shot.recommended_lens != last_lens:
                    lens_switches += 1
                last_lens = shot.recommended_lens
                block_shots.append(ScheduledShot(shot, block.name, i + 1).to_dict())

            schedule.append({
                "block": block.name,
                "priority": block.priority,
                "estimatedMinutes": block.estimated_duration_min,
                "shotCount": len(block.shots),
                "shots": block_shots,
            })

        return {
            "schedule": schedule,
            "totalShots": len(beats),
            "totalEstimatedMinutes": sum(b.estimated_duration_min for b in sorted_blocks),
            "lensSwitches": lens_switches,
            "optimizationNote": self._get_optimization_note(lens_switches, len(beats)),
        }

    @staticmethod
    def _get_optimization_note(lens_switches: int, total_shots: int) -> str:
        """Generate a human-readable optimization note."""
        ratio = lens_switches / max(total_shots, 1)
        if ratio < 0.3:
            return "Efficient setup — minimal lens changes required."
        elif ratio < 0.6:
            return "Moderate lens changes — plan your bag organization."
        else:
            return "Frequent lens changes — consider a second body for efficiency."


def get_scheduler() -> ShootScheduler:
    return ShootScheduler()
