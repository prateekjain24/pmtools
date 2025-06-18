from typing import Optional, Dict, Any
from app.llm.base import LLMProvider, LLMError, LLMUnavailableError
from app.llm.gemini import GeminiProvider
from app.llm.anthropic_client import AnthropicProvider
from app.core.config import settings


class LLMManager:
    """Manages multiple LLM providers with fallback support."""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize available LLM providers."""
        # Initialize Gemini
        if settings.google_api_key and not settings.google_api_key.startswith("your_"):
            try:
                self.providers["gemini"] = GeminiProvider(
                    api_key=settings.google_api_key,
                    model_name=settings.gemini_model
                )
                print(f"Initialized Gemini provider with model: {settings.gemini_model}")
            except LLMError as e:
                print(f"Failed to initialize Gemini provider: {e}")
                pass
        
        # Initialize Anthropic
        if settings.anthropic_api_key and not settings.anthropic_api_key.startswith("your_"):
            try:
                self.providers["anthropic"] = AnthropicProvider(
                    api_key=settings.anthropic_api_key,
                    model_name=settings.anthropic_model
                )
                print(f"Initialized Anthropic provider with model: {settings.anthropic_model}")
            except LLMError as e:
                print(f"Failed to initialize Anthropic provider: {e}")
                pass
        
        print(f"Available LLM providers: {list(self.providers.keys())}")
    
    def get_available_providers(self) -> list[str]:
        """Get list of available provider names."""
        return [name for name, provider in self.providers.items() if provider.is_available()]
    
    async def generate_text(
        self, 
        prompt: str, 
        preferred_provider: Optional[str] = None,
        use_fallback: bool = True,
        **kwargs
    ) -> str:
        """
        Generate text using the specified provider or fallback.
        
        Args:
            prompt: The text prompt
            preferred_provider: Preferred LLM provider name
            use_fallback: Whether to use fallback if preferred provider fails
            **kwargs: Additional arguments for the LLM
        
        Returns:
            Generated text response
        """
        providers_to_try = []
        
        # Add preferred provider first
        if preferred_provider and preferred_provider in self.providers:
            providers_to_try.append(preferred_provider)
        
        # Add fallback providers if enabled
        if use_fallback:
            for name in self.get_available_providers():
                if name not in providers_to_try:
                    providers_to_try.append(name)
        
        if not providers_to_try:
            raise LLMUnavailableError("No LLM providers are available")
        
        last_error = None
        for provider_name in providers_to_try:
            provider = self.providers[provider_name]
            
            if not provider.is_available():
                continue
            
            try:
                return await provider.generate_text(prompt, **kwargs)
            except LLMError as e:
                last_error = e
                continue
        
        raise LLMError(f"All LLM providers failed. Last error: {last_error}")


# Global LLM manager instance
llm_manager = LLMManager()