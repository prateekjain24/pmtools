# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an A/B Testing Validation & Analysis API designed to serve as a statistical consultant for Product Managers. The API provides two core utilities:

1. **Pre-Experiment Feasibility Calculator** (`/validate/setup`) - Validates experiment design and calculates statistical feasibility
2. **Post-Experiment Results Interpreter** (`/analyze/results`) - Interprets raw experiment data with LLM-powered insights

## Development Commands

### Setup and Installation
```bash
# Install dependencies
uv sync

# Install development dependencies
uv sync --dev
```

### Running the Application
```bash
# Run development server with auto-reload
uv run uvicorn app.main:app --reload

# Run on specific host/port
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run in production mode
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Testing
```bash
# Run all tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app

# Run specific test file
uv run pytest tests/test_statistics.py

# Run specific test
uv run pytest tests/test_api.py::TestValidateSetupEndpoint::test_valid_setup_request_relative_mde
```

### Code Quality
```bash
# Format code
uv run black .

# Sort imports
uv run isort .

# Lint code
uv run flake8 app/ tests/

# Type checking
uv run mypy app/
```

## Project Structure

```
app/
├── main.py                 # FastAPI application entry point
├── core/
│   └── config.py          # Settings and configuration
├── api/
│   ├── validate.py        # /validate/setup endpoint
│   └── analyze.py         # /analyze/results endpoint
├── models/
│   ├── requests.py        # Pydantic request models
│   └── responses.py       # Pydantic response models
├── statistics/
│   └── calculations.py    # Statistical calculations
└── llm/
    ├── base.py            # LLM provider interface
    ├── gemini.py          # Google Gemini provider
    ├── anthropic_client.py # Anthropic Claude provider
    ├── manager.py         # LLM manager with fallback
    └── prompts.py         # LLM prompt templates
```

## API Endpoints (V1.0)

### POST /validate/setup
Analyzes proposed experiment setup for statistical feasibility.

**Key inputs**: hypothesis, baseline conversion rate, MDE (relative or absolute), traffic estimates
**Key outputs**: sample size calculations, test duration estimates, trade-off matrices, hypothesis assessment

### POST /analyze/results
Interprets experiment results with actionable recommendations.

**Key inputs**: experiment context, results data (variants, conversions), optional PM notes
**Key outputs**: statistical summary, LLM-generated interpretation narrative, recommended next steps

## Environment Configuration

Copy `.env.example` to `.env` and configure:

### API Keys
- `GOOGLE_API_KEY`: Google Gemini API key
- `ANTHROPIC_API_KEY`: Anthropic Claude API key

### Model Configuration
- `GEMINI_MODEL`: Gemini model name (default: "gemini-2.5-flash")
- `ANTHROPIC_MODEL`: Claude model name (default: "claude-sonnet-4-20250514")

### LLM Settings
- `DEFAULT_LLM_PROVIDER`: "gemini" or "anthropic"
- `LLM_FALLBACK_ENABLED`: true/false

### Testing LLM Connectivity
```bash
# Check LLM provider status
curl http://localhost:8000/llm/status

# Test with specific models
GEMINI_MODEL=gemini-1.5-flash uv run uvicorn app.main:app --reload
```

## Technical Architecture

- **FastAPI**: Modern Python web framework with automatic API docs
- **Pydantic**: Data validation and settings management
- **SciPy/StatsModels**: Statistical calculations and power analysis
- **Google Generative AI**: Gemini integration with fallback support
- **Anthropic**: Claude API integration with fallback support
- **UV**: Fast Python package manager for dependency management

## Key Statistical Concepts

- **MDE (Minimum Detectable Effect)**: Can be specified as relative percentage or absolute value
- **Trade-off Matrix**: Shows how test duration changes with different MDEs
- **Statistical Power**: Default 0.80 (80%)
- **Significance Level**: Default 0.05 (5%)

## LLM Integration

The API uses a fallback system between Google Gemini and Anthropic Claude:
1. Attempts to use the configured default provider
2. Falls back to alternative provider if the first fails
3. Provides static fallback responses if all LLM calls fail

### Current Models
- **Gemini**: `gemini-2.5-flash` (latest stable)
- **Claude**: `claude-sonnet-4-20250514` (Claude Sonnet 4)

### Model Features
- **Hypothesis Assessment**: AI-powered clarity scoring and improvement suggestions
- **Results Interpretation**: Plain-English explanation of statistical results
- **Next Steps**: Actionable recommendations with confidence levels
- **Follow-up Questions**: Strategic questions for deeper analysis

## Core Architecture Principles

- **Headless API-only**: No GUI, pure REST API
- **Stateless**: No data persistence, user accounts, or authentication in V1
- **Educational**: Provides plain-English explanations alongside statistical calculations
- **Context-aware**: Combines quantitative analysis with qualitative PM insights using LLM
- **Resilient**: LLM fallback ensures API remains functional even if AI services are unavailable

## Docker Deployment

The PM Tools API is containerized for production deployment. Docker provides consistent deployment across environments.

### Docker Build and Run

```bash
# Build the Docker image
docker build -t pmtools-api:latest .

# Run container locally for testing
docker run -d \
  --name pmtools-api \
  -p 8000:8000 \
  -e API_DEBUG=false \
  -e LOG_LEVEL=info \
  -e GOOGLE_API_KEY=your_google_api_key \
  -e ANTHROPIC_API_KEY=your_anthropic_api_key \
  pmtools-api:latest

# Check container health
curl http://localhost:8000/health
```

### Production Deployment with Docker Compose

```bash
# Deploy using docker-compose (recommended for production)
docker-compose up -d

# Check logs
docker-compose logs -f pmtools-api

# Stop deployment
docker-compose down
```

### Coolify Deployment

This API is optimized for deployment on [Coolify](https://coolify.io/) - a self-hosted alternative to Heroku/Vercel.

**Step 1: Repository Setup**
- Push your code to a Git repository (GitHub/GitLab)
- Ensure `Dockerfile` and `docker-compose.yml` are in the root

**Step 2: Coolify Configuration**
1. Create new application in Coolify
2. Connect your Git repository 
3. Set build pack to "Docker Compose"
4. Configure environment variables as secrets:
   - `GOOGLE_API_KEY` (required)
   - `ANTHROPIC_API_KEY` (required)
   - `API_DEBUG=false`
   - `LOG_LEVEL=info`

**Step 3: Health Check Setup**
- Coolify will automatically use the health check defined in docker-compose.yml
- Health endpoint: `/health`
- Expected response: `{"status": "healthy"}`

### Docker Environment Variables

All configuration is handled via environment variables:

```bash
# Core API Settings
API_HOST=0.0.0.0              # Container host binding
API_PORT=8000                 # Container port
API_DEBUG=false               # Disable docs in production
LOG_LEVEL=info                # Logging level: debug, info, warning, error
WORKERS=4                     # Uvicorn worker processes

# LLM Configuration
DEFAULT_LLM_PROVIDER=gemini           # Primary LLM provider
LLM_FALLBACK_ENABLED=true            # Enable fallback to secondary provider
GEMINI_MODEL=gemini-2.5-flash        # Google Gemini model
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Anthropic Claude model

# API Keys (set as secrets in Coolify)
GOOGLE_API_KEY=your_key_here         # Required for Gemini
ANTHROPIC_API_KEY=your_key_here      # Required for Claude
```

### Container Features

**Security**:
- Non-root user (`pmtools`) for container security
- Minimal attack surface with slim Python base image
- No unnecessary packages or tools in production image

**Performance**:
- UV package manager for fast dependency installation
- Multi-worker Uvicorn for production workloads
- Resource limits configurable via docker-compose

**Monitoring**:
- Built-in health checks for container orchestration
- Structured logging for production debugging
- LLM provider status endpoint (`/llm/status`)

## Troubleshooting

### Docker Issues
```bash
# Build image with no cache
docker build --no-cache -t pmtools-api:latest .

# Check container logs
docker logs pmtools-api

# Debug container interactively
docker run -it --entrypoint /bin/bash pmtools-api:latest

# Test container health
docker exec pmtools-api curl -f http://localhost:8000/health

# Remove all containers and images for clean restart
docker system prune -a
```

### LLM Issues
```bash
# Check provider status
curl http://localhost:8000/llm/status

# Common errors and solutions:
# 1. "404 models/gemini-pro is not found" - Update GEMINI_MODEL to gemini-2.5-flash
# 2. "Invalid API key" - Check GOOGLE_API_KEY/ANTHROPIC_API_KEY in .env
# 3. "No LLM providers available" - Ensure at least one valid API key is configured
# 4. "Rate limit exceeded" - Wait or switch to different provider
```

### Development Issues
```bash
# Clear Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -delete

# Reinstall dependencies
uv sync --dev

# Check API health
curl http://localhost:8000/health
```

### Streamlit Issues
```bash
# Restart Streamlit with cache clearing
uv run streamlit run streamlit_app/main.py --server.headless true

# Check API connectivity from Streamlit
# Look for "API Connected" status in the web interface
```