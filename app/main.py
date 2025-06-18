from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.validate import router as validate_router
from app.api.analyze import router as analyze_router

app = FastAPI(
    title="PM Tools - A/B Testing API",
    description="A/B Testing Validation & Analysis API for Product Managers",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


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