import google.generativeai as genai
from typing import Optional
from app.llm.base import LLMProvider, LLMError, LLMUnavailableError


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider."""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self.model = None
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel(model_name)
            except Exception as e:
                raise LLMError(f"Failed to initialize Gemini with model {model_name}: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Gemini is available and configured."""
        return self.api_key is not None and self.model is not None
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Gemini."""
        if not self.is_available():
            raise LLMUnavailableError("Gemini provider is not available")
        
        try:
            response = self.model.generate_content(prompt)
            if response.text:
                return response.text
            else:
                raise LLMError("Gemini returned empty response")
        except Exception as e:
            raise LLMError(f"Gemini generation failed with model {self.model_name}: {str(e)}")