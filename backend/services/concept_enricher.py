"""Concept enrichment — extracts keywords, infers time/mood, expands sparse concepts.

Uses YAKE (unsupervised, 2MB, no training data) if available,
falls back to a simple regex-based keyword extractor.
"""

import re
from typing import List, Optional, Tuple


# Time-of-day keyword detection
TIME_KEYWORDS = {
    "golden_hour_am": ["dawn", "sunrise", "morning", "early", "first light", "daybreak"],
    "golden_hour_pm": ["sunset", "dusk", "evening", "twilight", "golden hour", "magic hour"],
    "night": ["night", "midnight", "dark", "noir", "evening", "moon"],
    "blue_hour": ["blue hour", "pre-dawn", "nightfall", "twilight"],
    "midday": ["noon", "midday", "afternoon", "harsh sun", "bright"],
}

# Mood keyword detection
MOOD_KEYWORDS = {
    "melancholy": ["sad", "melancholy", "lonely", "grief", "loss", "solitude", "alone"],
    "hopeful": ["hope", "hopeful", "joy", "triumph", "victory", "freedom", "new beginning"],
    "tense": ["tense", "thriller", "danger", "chase", "escape", "fear", "suspense"],
    "intimate": ["love", "romance", "intimate", "tender", "connection", "embrace"],
    "contemplative": ["quiet", "still", "peaceful", "calm", "thinking", "waiting"],
    "awe": ["vast", "epic", "beautiful", "amazing", "awe", "stunning", "majestic"],
}

# Location keyword detection
LOCATION_KEYWORDS = {
    "harbor": ["harbor", "port", "dock", "boat", "ship", "marina", "wharf", "pier"],
    "city": ["city", "urban", "street", "downtown", "building", "skyline", "neon"],
    "nature": ["forest", "mountain", "ocean", "beach", "river", "lake", "valley", "field"],
    "interior": ["room", "apartment", "house", "studio", "office", "bedroom", "kitchen"],
    "market": ["market", "bazaar", "shop", "store", "restaurant", "cafe"],
}

# Subject expansion dictionary — turns a keyword into a richer scene
SUBJECT_EXPANSIONS = {
    "fisherman": "weathered fisherman on a wooden boat, hands casting nets into still water, mist rising from the surface",
    "pianist": "a lone pianist at a grand piano, fingers moving across ivory keys, sheets of music catching the light",
    "runner": "a figure running through a landscape, breath visible in the morning air, determined expression",
    "dancer": "a dancer in motion, fabric flowing through the air, movement frozen in time",
    "lover": "two figures in an embrace, faces close, soft light catching their features",
    "child": "a child discovering something new, wonder in their eyes, small hands reaching out",
    "soldier": "a lone figure in uniform, silhouette against an open sky, carrying the weight of their journey",
    "artist": "an artist at work, paint-stained hands, focused gaze barely visible beneath a brimmed hat",
}

# Default concept expansions when no specific subject is matched
DEFAULT_EXPANSIONS = [
    "soft natural light creates depth and atmosphere",
    "the environment tells a story of its own",
    "every frame is composed with intent and purpose",
]


class EnrichedConcept:
    """Output of concept enrichment — ready for template generation."""
    def __init__(
        self,
        original: str,
        keywords: List[Tuple[str, float]],
        time_of_day: Optional[str],
        mood: Optional[str],
        location: Optional[str],
        expanded: str,
        defaults: List[str],
    ):
        self.original = original
        self.keywords = keywords
        self.time_of_day = time_of_day
        self.mood = mood
        self.location = location
        self.expanded = expanded
        self.defaults = defaults

    def to_dict(self) -> dict:
        return {
            "original": self.original,
            "keywords": [k for k, _ in self.keywords],
            "timeOfDay": self.time_of_day,
            "mood": self.mood,
            "location": self.location,
            "expanded": self.expanded,
        }


class ConceptEnricher:
    """Lightweight concept enrichment — no heavy ML dependencies needed."""

    def __init__(self):
        self._yake_available = False
        # Try importing YAKE
        try:
            import yake
            self._yake = yake.KeywordExtractor(lan="en", n=2, dedupLim=0.9, top=5)
            self._yake_available = True
        except ImportError:
            self._yake = None

    def _extract_keywords_basic(self, text: str) -> List[Tuple[str, float]]:
        """Simple keyword extraction: multi-word phrases first, then unique significant words."""
        text_lower = text.lower()
        # Remove common stop words
        stop_words = {
            "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "and", "or",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
            "do", "does", "did", "will", "would", "could", "should", "may", "might",
            "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those",
            "about", "into", "through", "during", "before", "after", "above", "below",
            "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
        }
        words = text_lower.split()
        significant = [w.strip(".,!?;:\"'()[]{}") for w in words if w not in stop_words and len(w) > 2]
        # Count frequency
        from collections import Counter
        freq = Counter(significant)
        return [(word, 1.0 / (freq[word] + 1)) for word in freq.most_common(10)]

    def _extract_keywords(self, text: str) -> List[Tuple[str, float]]:
        """Extract keywords using YAKE if available, else basic method."""
        if self._yake_available:
            try:
                return self._yake.extract_keywords(text)
            except Exception:
                pass
        return self._extract_keywords_basic(text)

    def _detect_category(self, text: str, category_map: dict) -> Optional[str]:
        """Detect which category matches the text best."""
        text_lower = text.lower()
        best_match = None
        best_count = 0
        for category, keywords in category_map.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > best_count:
                best_count = count
                best_match = category
        return best_match

    def _expand_subject(self, text: str, keywords: List[str]) -> Optional[str]:
        """Try to expand a known subject into a richer description."""
        text_lower = text.lower()
        for subject, expansion in SUBJECT_EXPANSIONS.items():
            if subject in text_lower:
                return expansion
        # Check keywords too
        for keyword in keywords:
            kw_lower = keyword.lower()
            for subject, expansion in SUBJECT_EXPANSIONS.items():
                if subject in kw_lower:
                    return expansion
        return None

    def enrich(self, concept_text: str) -> EnrichedConcept:
        """Full enrichment pipeline: extract → infer → expand → return."""
        defaults_applied = []

        # Step 1: Keyword extraction
        raw_keywords = self._extract_keywords(concept_text)
        keywords = [(kw, score) for kw, score in raw_keywords if len(kw) > 2]

        # Step 2: Detect categories
        time_of_day = self._detect_category(concept_text, TIME_KEYWORDS)
        mood = self._detect_category(concept_text, MOOD_KEYWORDS)
        location = self._detect_category(concept_text, LOCATION_KEYWORDS)

        # Step 3: Apply defaults for missing info
        if not time_of_day:
            if mood in ("melancholy", "tense"):
                time_of_day = "blue_hour"
            elif mood in ("hopeful", "joyful"):
                time_of_day = "golden_hour_pm"
            else:
                time_of_day = "golden_hour_am"
            defaults_applied.append(f"time_of_day defaulted to {time_of_day}")

        if not mood:
            mood = "contemplative"
            defaults_applied.append(f"mood defaulted to {mood}")

        # Step 4: Build expanded prompt
        keyword_words = [kw for kw, _ in keywords]
        subject_expansion = self._expand_subject(concept_text, keyword_words)

        if subject_expansion:
            expanded = subject_expansion
        else:
            expanded = concept_text

        # Add time + mood descriptors
        if time_of_day:
            time_desc = " ".join(time_of_day.split("_")).title()
            expanded += f", {time_desc.lower()} lighting"
        if mood:
            expanded += f", {mood} mood"

        # Add location if found
        if location and location not in expanded.lower():
            expanded += f", set in a {location}"

        return EnrichedConcept(
            original=concept_text,
            keywords=keywords,
            time_of_day=time_of_day,
            mood=mood,
            location=location,
            expanded=expanded,
            defaults=defaults_applied,
        )


def get_enricher() -> ConceptEnricher:
    return ConceptEnricher()
