# CLAUDE.md - Backend Development

This file provides guidance for working with the FastAPI backend (`app/` directory).

## Backend Architecture

The FastAPI backend is organized into clear modules:

```
app/
├── main.py                 # FastAPI application and route registration
├── core/
│   └── config.py          # Settings and environment configuration
├── api/
│   ├── validate.py        # /validate/setup endpoint implementation
│   └── analyze.py         # /analyze/results endpoint implementation
├── models/
│   ├── requests.py        # Pydantic request models with validation
│   └── responses.py       # Pydantic response models
├── statistics/
│   └── calculations.py    # Core statistical calculations
└── llm/
    ├── base.py            # LLM provider interface
    ├── gemini.py          # Google Gemini implementation
    ├── anthropic_client.py # Anthropic Claude implementation
    ├── manager.py         # LLM manager with fallback logic
    └── prompts.py         # LLM prompt templates
```

## Development Patterns

### API Endpoint Structure
```python
@router.post("/endpoint", response_model=ResponseModel)
async def endpoint_handler(request: RequestModel):
    try:
        # 1. Extract and validate input
        # 2. Perform calculations
        # 3. Call LLM if needed
        # 4. Build response
        return ResponseModel(...)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Statistical Functions
- Located in `app/statistics/calculations.py`
- Pure functions with clear inputs/outputs
- Use scipy/numpy for calculations
- Include docstrings with parameter descriptions

### LLM Integration Pattern
```python
# Always use try/catch with fallbacks
try:
    llm_response = await llm_manager.generate_text(
        prompt=prompt,
        preferred_provider=settings.default_llm_provider,
        use_fallback=settings.llm_fallback_enabled
    )
    parsed_result = parse_llm_response(llm_response)
except Exception as e:
    # Always provide fallback responses
    parsed_result = get_fallback_response()
```

## Testing Backend Code

### Running Tests
```bash
# Run all backend tests
uv run pytest tests/test_statistics.py
uv run pytest tests/test_api.py

# Run with coverage
uv run pytest --cov=app tests/

# Run specific test
uv run pytest tests/test_statistics.py::TestSampleSizeCalculation::test_relative_mde_calculation
```

### Test Patterns
- **Unit tests** for statistical functions in `test_statistics.py`
- **Integration tests** for API endpoints in `test_api.py`
- **Mock LLM responses** to avoid API calls during testing
- **Parameterized tests** for multiple input scenarios

## Configuration Management

### Environment Variables
```python
# Access via settings object
from app.core.config import settings

# LLM configuration
api_key = settings.google_api_key
model_name = settings.gemini_model
```

### Adding New Settings
1. Add field to `Settings` class in `config.py`
2. Add to `.env.example` with documentation
3. Update CLAUDE.md with new variable

## Error Handling

### API Errors
```python
# Validation errors (400)
raise HTTPException(status_code=400, detail="Invalid input")

# Server errors (500) 
raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")
```

### LLM Errors
- Always provide fallback responses
- Log errors for debugging
- Include error details in fallback messages during development

## Adding New Statistical Functions

1. **Add function** to `app/statistics/calculations.py`
2. **Write tests** in `tests/test_statistics.py`
3. **Add API endpoint** if needed
4. **Update Pydantic models** for request/response
5. **Document** in function docstrings

## LLM Development

### Adding New Prompts
1. Add template to `app/llm/prompts.py`
2. Include clear instructions and examples
3. Test with multiple models
4. Handle parsing edge cases

### Adding New Providers
1. Inherit from `LLMProvider` base class
2. Implement `generate_text()` and `is_available()`
3. Add to LLM manager initialization
4. Update environment configuration

## Performance Considerations

- **Async/await** for LLM calls
- **Connection pooling** for HTTP clients
- **Caching** for expensive calculations (if needed)
- **Timeout handling** for external API calls

## Security

- **No secrets** in code or logs
- **Input validation** with Pydantic
- **Rate limiting** considerations for LLM APIs
- **Environment isolation** for API keys