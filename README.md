# Director's Eye

A personal AI film director that turns your cinematic ideas into structured shoot plans — optimized for mobile and external APIs.

## Architecture

```
Frontend (React + Vite + Tailwind)
       |
       | HTTP requests
       v
Backend (FastAPI) — Port 8000
  |         |         |
  v         v         v
DeepSeek   OpenAI    Gemini
 API        API        API
Scriptment  Scriptment  Scriptment + Images
```

**Auto-detection:** The backend tries providers in order: **DeepSeek → OpenAI → Gemini**. At least one key must be configured. Gemini also handles image generation (storyboard frames).

**Note:** This version uses external APIs only — no local AI models. This makes it ideal for mobile use and devices without dedicated GPUs.

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# API keys are already configured in .env (found from other projects)
# To use different keys, edit backend/.env

# Run the server
python main.py
# Server runs on http://localhost:8000
```

### API Keys (already configured)

| Service | Key Source | Status | Used For |
|---------|-----------|--------|----------|
| **OpenAI** | `art_of_war/.env` | ✅ Working | Scriptments (primary) |
| **Gemini** | `Shnuk/backend/.env` | ✅ Working | Scriptments (fallback) + Images |
| **DeepSeek** | — | ❌ Not found | Would be cheapest option |

If you have a DeepSeek key, add it to `backend/.env` for the cheapest scriptment generation (~$0.002 per project).

## Frontend Setup

```bash
cd ..  # project root

# Install dependencies (already done)
npm install

# Run dev server
npm run dev
# Dev server on http://localhost:5173
```

## Production Build

```bash
# Build frontend
npm run build

# Backend serves the built frontend automatically
# Access at http://localhost:8000
```

## Features

- **Scriptment Generation** — AI-crafted visual narrative with beats, shot types, and emotional arcs
- **Storyboard Frames** — AI-generated cinematic images for each shot (Gemini or Pollinations fallback)
- **Shoot List** — Detailed camera settings calibrated for Sony a6700 + Meike lenses
- **Gear Profiles** — Customizable camera and lens configurations

## Project Structure

```
directors-eye/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings and camera constants
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # API keys (already configured)
│   ├── .env.example         # Template for new setups
│   ├── routers/
│   │   ├── scriptment.py    # LLM integration (DeepSeek/OpenAI/Gemini)
│   │   ├── storyboard.py    # Image generation
│   │   ├── shootlist.py     # Shot list assembly
│   │   └── voice.py         # TTS endpoints
│   ├── services/
│   │   └── llm.py           # Unified LLM client
│   └── models/
│       ├── sdxl_turbo.py    # Image generation (Gemini/Pollinations)
│       └── kokoro_tts.py    # TTS placeholder
├── src/                     # React frontend
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── services/api.ts    # Frontend API client
│   └── types/
└── package.json
```

## Testing the APIs

```bash
cd backend
source venv/bin/activate

# Test scriptment generation
python -c "
import asyncio
from services.llm import get_llm_client
async def test():
    client = get_llm_client()
    result = await client.generate_scriptment('A 60s film about a pianist in a rainstorm')
    print('Title:', result['title'])
asyncio.run(test())
"

# Test image generation
python -c "
import asyncio
from models.sdxl_turbo import get_generator
async def test():
    gen = get_generator()
    img = await gen.generate_frame('A pianist playing in heavy rain', 'Wide', 'Melancholy', '33mm')
    print('Image length:', len(img))
asyncio.run(test())
"
```
