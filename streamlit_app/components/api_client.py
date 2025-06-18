import requests
import streamlit as st
from typing import Dict, Any, Optional
import os


class APIClient:
    """HTTP client for communicating with the FastAPI backend."""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("API_BASE_URL", "http://localhost:8000")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and errors."""
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if response.status_code == 422:
                # Validation error
                error_detail = response.json().get("detail", "Validation error")
                raise APIError(f"Validation Error: {error_detail}")
            elif response.status_code == 400:
                # Client error
                error_detail = response.json().get("detail", "Bad request")
                raise APIError(f"Request Error: {error_detail}")
            elif response.status_code >= 500:
                # Server error
                raise APIError("Server error. Please try again later.")
            else:
                raise APIError(f"API Error: {str(e)}")
    
    def check_health(self) -> bool:
        """Check if the API is healthy."""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def validate_setup(self, setup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call the /validate/setup endpoint."""
        try:
            response = self.session.post(
                f"{self.base_url}/validate/setup",
                json=setup_data,
                timeout=30
            )
            return self._handle_response(response)
        except Exception as e:
            if isinstance(e, APIError):
                raise e
            raise APIError(f"Failed to validate setup: {str(e)}")
    
    def analyze_results(self, results_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call the /analyze/results endpoint."""
        try:
            response = self.session.post(
                f"{self.base_url}/analyze/results",
                json=results_data,
                timeout=60  # Longer timeout for LLM processing
            )
            return self._handle_response(response)
        except Exception as e:
            if isinstance(e, APIError):
                raise e
            raise APIError(f"Failed to analyze results: {str(e)}")


class APIError(Exception):
    """Custom exception for API errors."""
    pass


# Singleton instance
@st.cache_resource
def get_api_client() -> APIClient:
    """Get cached API client instance."""
    return APIClient()