from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # LLM API Configuration
    google_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    
    # API Server Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False
    
    # LLM Provider Configuration
    default_llm_provider: str = "gemini"
    llm_fallback_enabled: bool = True
    
    # Production Settings
    workers: int = 4
    log_level: str = "info"

    class Config:
        env_file = ".env"


settings = Settings()