"""FastAPI main application for Uma card manager."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import cards, enrichment, metadata, recommendations

app = FastAPI(
    title="Uma Musume Card Manager API",
    version="1.0.0",
    description="REST API for managing Uma card collection and enrichment",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware for development (allows frontend dev server on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

# Register API routes with /api/v1 prefix
app.include_router(cards.router, prefix="/api/v1")
app.include_router(enrichment.router, prefix="/api/v1")
app.include_router(metadata.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Serve frontend static files in production (after npm run build)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
