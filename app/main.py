from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.validate import router as validate_router
from app.api.analyze import router as analyze_router
from app.core.config import settings
import logging

# Configure logging for production
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="PM Tools - A/B Testing API",
    description="A/B Testing Validation & Analysis API for Product Managers",
    version="1.0.0",
    docs_url="/docs" if settings.api_debug else None,  # Disable docs in production
    redoc_url="/redoc" if settings.api_debug else None,  # Disable redoc in production
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(validate_router)
app.include_router(analyze_router)


@app.get("/")
async def root():
    return {
        "message": "PM Tools - A/B Testing API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.api_debug else "disabled"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration and monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": "production" if not settings.api_debug else "development"
    }


@app.get("/llm/status")
async def llm_status():
    """Check LLM provider status."""
    from app.llm.manager import llm_manager
    from app.core.config import settings
    
    available_providers = llm_manager.get_available_providers()
    
    return {
        "available_providers": available_providers,
        "default_provider": settings.default_llm_provider,
        "fallback_enabled": settings.llm_fallback_enabled,
        "gemini_model": settings.gemini_model,
        "anthropic_model": settings.anthropic_model,
        "total_providers": len(llm_manager.providers)
    }