"""Director's Eye — FastAPI Backend Entry Point"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routers import scriptment, storyboard, shootlist, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🎬 Director's Eye backend starting...")
    print(f"   DeepSeek API: {'Configured' if os.getenv('DEEPSEEK_API_KEY') else 'NOT CONFIGURED'}")
    print(f"   Gemini API: {'Configured' if os.getenv('GEMINI_API_KEY') else 'NOT CONFIGURED (will use Pollinations fallback)'}")
    yield
    # Shutdown
    print("🎬 Shutting down...")


app = FastAPI(
    title="Director's Eye",
    description="Personal AI film director backend — uses external APIs (DeepSeek, Gemini, Pollinations)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(scriptment.router)
app.include_router(storyboard.router)
app.include_router(shootlist.router)
app.include_router(voice.router)

# Health check
@app.get("/health")
async def health():
    from config import DEEPSEEK_API_KEY, GEMINI_API_KEY
    return {
        "status": "ok",
        "deepseek_configured": bool(DEEPSEEK_API_KEY),
        "gemini_configured": bool(GEMINI_API_KEY),
        "mode": "external_api",
    }

# Serve frontend (optional — if hosting together)
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
