from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.api.municipalities import router as municipalities_router
from app.api.categories import router as categories_router
from app.api.places import router as places_router

app = FastAPI(
    title="Montenegro Coast City Guide API",
    description="Backend API for the Montenegro coastal city guide mobile app",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local media for dev
media_path = Path(settings.media_root)
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

# Register routers
app.include_router(municipalities_router)
app.include_router(categories_router)
app.include_router(places_router)


@app.get("/")
async def root():
    return {"service": "Montenegro Coast City Guide API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
