# CLAUDE.md - Testing Guidelines

This file provides guidance for testing the PM Tools A/B Testing API.

## Test Structure

```
tests/
├── test_statistics.py         # Unit tests for statistical calculations
├── test_api.py               # Integration tests for API endpoints
├── test_llm_integration.py   # LLM provider tests (if needed)
└── conftest.py              # Test configuration and fixtures
```

## Running Tests

### Basic Test Commands
```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_statistics.py
uv run pytest tests/test_api.py

# Run with coverage
uv run pytest --cov=app tests/

# Run with verbose output
uv run pytest -v

# Run specific test class or method
uv run pytest tests/test_statistics.py::TestSampleSizeCalculation
uv run pytest tests/test_api.py::TestValidateSetupEndpoint::test_valid_setup_request_relative_mde
```

## Statistical Function Testing

### Test Categories

#### Sample Size Calculations
```python
class TestSampleSizeCalculation:
    def test_relative_mde_calculation(self):
        """Test sample size with relative MDE."""
        sample_size = calculate_sample_size(
            baseline_conversion_rate=0.05,
            minimum_detectable_effect=0.20,
            statistical_power=0.8,
            significance_level=0.05,
            is_relative_mde=True
        )
        assert isinstance(sample_size, int)
        assert sample_size > 0
    
    def test_absolute_mde_calculation(self):
        """Test sample size with absolute MDE."""
        # Similar structure for absolute MDE
    
    def test_higher_power_requires_larger_sample(self):
        """Test statistical relationships."""
        # Verify that higher power needs more samples
```

#### Statistical Analysis
```python
class TestConversionMetrics:
    def test_basic_conversion_calculation(self):
        """Test conversion rate calculations."""
        metrics = calculate_conversion_metrics(
            control_users=1000,
            control_conversions=50,
            treatment_users=1000,
            treatment_conversions=60
        )
        
        assert metrics["control_conversion_rate"] == 0.05
        assert metrics["treatment_conversion_rate"] == 0.06
        assert abs(metrics["relative_lift"] - 0.2) < 0.01
        assert "p_value" in metrics
        assert "confidence_interval" in metrics
```

### Test Data Patterns
```python
# Use realistic A/B test scenarios
VALID_TEST_CASES = [
    {
        "baseline_rate": 0.05,
        "mde": 0.20,
        "expected_sample_range": (1000, 5000)
    },
    {
        "baseline_rate": 0.10,
        "mde": 0.15,
        "expected_sample_range": (800, 3000)
    }
]

@pytest.mark.parametrize("test_case", VALID_TEST_CASES)
def test_sample_size_ranges(test_case):
    """Test multiple realistic scenarios."""
    sample_size = calculate_sample_size(...)
    min_expected, max_expected = test_case["expected_sample_range"]
    assert min_expected <= sample_size <= max_expected
```

## API Endpoint Testing

### Test Client Setup
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestValidateSetupEndpoint:
    def test_valid_setup_request_relative_mde(self):
        """Test valid setup validation request."""
        request_data = {
            "hypothesis": "We believe that adding a CTA button will increase conversions",
            "metric": {"baseline_conversion_rate": 0.05},
            "parameters": {
                "variants": 2,
                "minimum_detectable_effect_relative": 0.20,
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {"estimated_daily_users": 1000}
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "inputs_summary" in data
        assert "feasibility_analysis" in data
        assert "hypothesis_assessment" in data
```

### Error Testing
```python
def test_invalid_setup_both_mdes(self):
    """Test validation with both MDEs provided."""
    request_data = {
        # ... other fields
        "parameters": {
            "minimum_detectable_effect_relative": 0.20,
            "minimum_detectable_effect_absolute": 0.01,  # Both provided
            # ... other fields
        }
    }
    
    response = client.post("/validate/setup", json=request_data)
    assert response.status_code == 422  # Validation error

def test_invalid_baseline_rate(self):
    """Test with invalid baseline rate."""
    request_data = {
        # ...
        "metric": {"baseline_conversion_rate": 1.5}  # Invalid: > 1
    }
    
    response = client.post("/validate/setup", json=request_data)
    assert response.status_code == 422
```

## LLM Testing Strategies

### Mocking LLM Responses
```python
import pytest
from unittest.mock import patch, AsyncMock

@pytest.fixture
def mock_llm_response():
    return "Score: 8/10\nAssessment: Good hypothesis\nSuggestions: None needed"

@patch('app.llm.manager.llm_manager.generate_text')
async def test_hypothesis_assessment_with_mock(mock_generate, mock_llm_response):
    """Test hypothesis assessment with mocked LLM."""
    mock_generate.return_value = mock_llm_response
    
    # Test your endpoint
    response = client.post("/validate/setup", json=valid_request_data)
    
    # Verify LLM was called
    mock_generate.assert_called_once()
    
    # Verify response
    data = response.json()
    assessment = data["hypothesis_assessment"]
    assert assessment["score"] == 8
    assert "Good hypothesis" in assessment["assessment"]
```

### Testing LLM Fallbacks
```python
@patch('app.llm.manager.llm_manager.generate_text')
async def test_llm_fallback_behavior(mock_generate):
    """Test fallback when LLM fails."""
    mock_generate.side_effect = Exception("LLM service unavailable")
    
    response = client.post("/validate/setup", json=valid_request_data)
    assert response.status_code == 200  # Should still work
    
    data = response.json()
    assessment = data["hypothesis_assessment"]
    assert "fallback" in assessment["assessment"].lower()
```

## Test Data Management

### Fixtures for Common Data
```python
@pytest.fixture
def valid_setup_request():
    return {
        "hypothesis": "Test hypothesis",
        "metric": {"baseline_conversion_rate": 0.05},
        "parameters": {
            "variants": 2,
            "minimum_detectable_effect_relative": 0.20,
            "statistical_power": 0.8,
            "significance_level": 0.05
        },
        "traffic": {"estimated_daily_users": 1000}
    }

@pytest.fixture
def valid_results_request():
    return {
        "context": {
            "hypothesis": "Test hypothesis",
            "primary_metric_name": "conversion_rate"
        },
        "results_data": {
            "variants": [
                {"name": "control", "users": 1000, "conversions": 50},
                {"name": "treatment", "users": 1000, "conversions": 65}
            ]
        }
    }
```

## Performance Testing

### Load Testing Considerations
```python
def test_calculation_performance():
    """Test that calculations complete within reasonable time."""
    import time
    
    start_time = time.time()
    result = calculate_sample_size(...)
    end_time = time.time()
    
    assert end_time - start_time < 1.0  # Should complete in under 1 second
    assert result > 0
```

## Test Organization Best Practices

### Test Naming
```python
# Good test names describe what they test
def test_sample_size_increases_with_lower_baseline_rate(self):
def test_api_returns_422_for_missing_hypothesis(self):
def test_llm_fallback_when_gemini_unavailable(self):

# Use descriptive class names
class TestSampleSizeCalculation:
class TestValidateSetupEndpoint:
class TestLLMIntegration:
```

### Test Categories
```python
# Mark tests by category
@pytest.mark.unit
def test_statistical_calculation():
    pass

@pytest.mark.integration  
def test_api_endpoint():
    pass

@pytest.mark.slow
def test_full_workflow():
    pass

# Run specific categories
# pytest -m unit
# pytest -m "not slow"
```

## Continuous Integration

### Test Requirements for CI
- All tests must pass
- Coverage should be > 80%
- No LLM API calls in CI (use mocks)
- Fast execution (< 30 seconds total)

### CI Test Command
```bash
# Run tests without external dependencies
uv run pytest --cov=app --cov-report=xml tests/ -m "not slow"
```

## Test Coverage Goals

### Target Coverage
- **Statistical functions**: 100% (pure functions, no external deps)
- **API endpoints**: 90% (test happy path + error cases)
- **LLM integration**: 80% (focus on fallback behavior)
- **Overall project**: 85%

### Coverage Reports
```bash
# Generate HTML coverage report
uv run pytest --cov=app --cov-report=html tests/

# View report
open htmlcov/index.html
```