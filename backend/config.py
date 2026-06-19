"""Backend configuration and constants."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent

# API Keys
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

# Shot settings mapping
SHOT_SETTINGS = {
    "golden_hour": {
        "whiteBalance": "5600K",
        "iso": "100-400",
        "pictureProfile": "S-Log3",
        "aperture_base": "f/2.8",
    },
    "blue_hour": {
        "whiteBalance": "3200K",
        "iso": "400-800",
        "pictureProfile": "S-Log3",
        "aperture_base": "f/2.0",
    },
    "night": {
        "whiteBalance": "Auto",
        "iso": "1600-3200",
        "pictureProfile": "HLG",
        "aperture_base": "f/1.4",
    },
    "daylight": {
        "whiteBalance": "5600K",
        "iso": "100",
        "pictureProfile": "S-Log3",
        "aperture_base": "f/4.0",
    },
    "interior": {
        "whiteBalance": "4000K",
        "iso": "400-800",
        "pictureProfile": "HLG",
        "aperture_base": "f/1.4",
    },
    "overcast": {
        "whiteBalance": "6000K",
        "iso": "200-400",
        "pictureProfile": "S-Log3",
        "aperture_base": "f/2.8",
    },
}

LENS_SETTINGS = {
    "33mm": {
        "name": "Meike 33mm f/1.4",
        "equiv": "≈50mm",
        "strengths": "Wide storytelling, environmental portraits, zero breathing",
        "best_for": ["Establishing", "Wide", "Medium"],
    },
    "55mm": {
        "name": "Meike 55mm f/1.4",
        "equiv": "≈82mm",
        "strengths": "Intimate portraits, emotional compression, beautiful bokeh",
        "best_for": ["Close-up", "ECU", "Medium"],
    },
    "Find X9": {
        "name": "Find X9",
        "equiv": "Ultra-wide",
        "strengths": "B-roll, secondary angles, spontaneous captures",
        "best_for": ["POV", "Aerial", "Wide"],
    },
}

SHOT_TYPE_SETTINGS = {
    "Establishing": {"aperture": "f/8-f/11", "shutter": "1/48s", "motion": "static"},
    "Wide": {"aperture": "f/5.6-f/8", "shutter": "1/48s", "motion": "pan"},
    "Medium": {"aperture": "f/2.8-f/4", "shutter": "1/48s", "motion": "static"},
    "Close-up": {"aperture": "f/1.4-f/2", "shutter": "1/48s", "motion": "static"},
    "ECU": {"aperture": "f/2-f/2.8", "shutter": "1/48s", "motion": "static"},
    "POV": {"aperture": "f/4-f/5.6", "shutter": "1/50s", "motion": "handheld"},
    "Aerial": {"aperture": "f/5.6", "shutter": "1/60s", "motion": "drone"},
}
