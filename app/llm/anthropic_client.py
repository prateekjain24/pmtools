from anthropic import Anthropic
from typing import Optional
from app.llm.base import LLMProvider, LLMError, LLMUnavailableError


class AnthropicProvider(LLMProvider):
    """Anthropic Claude LLM provider."""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.model_name = model_name
        self.client = None
        
        if api_key:
            try:
                self.client = Anthropic(api_key=api_key)
            except Exception as e:
                raise LLMError(f"Failed to initialize Anthropic: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Anthropic is available and configured."""
        return self.api_key is not None and self.client is not None
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Claude."""
        if not self.is_available():
            raise LLMUnavailableError("Anthropic provider is not available")
        
        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            if response.content and len(response.content) > 0:
                return response.content[0].text
            else:
                raise LLMError("Anthropic returned empty response")
        except Exception as e:
            raise LLMError(f"Anthropic generation failed with model {self.model_name}: {str(e)}")