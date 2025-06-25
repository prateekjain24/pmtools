# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PM Tools is a comprehensive A/B testing solution for Product Managers, consisting of two integrated components:

1. **FastAPI Backend** (`app/`) - Statistical calculations and LLM-powered analysis
2. **Chrome Extension** (`chrome-extension/`) - Browser-based UI for instant access

The project serves as a "statistical consultant in a box" providing:
- **Pre-Experiment Feasibility Calculator** - Validates experiment design before running tests
- **Post-Experiment Results Interpreter** - Analyzes results with AI-powered insights

### 🎯 Future Vision: Standalone Chrome Extension
The next iteration will create a fully standalone Chrome extension where:
- All statistical calculations run client-side in the browser
- Users provide their own LLM API keys
- No server setup or maintenance required
- Instant availability for any PM with Chrome

## Architecture Overview

### Current Architecture (v1.0)
```
┌─────────────────────┐         ┌──────────────────────┐
│  Chrome Extension   │ <-----> │   FastAPI Backend    │
│  (UI + API Client)  │  HTTP   │ (Stats + LLM + API)  │
└─────────────────────┘         └──────────────────────┘
```

### Future Architecture (v2.0)
```
┌─────────────────────────────────────┐
│      Standalone Chrome Extension     │
│  (UI + Stats + Direct LLM Calls)    │
│         User's API Keys              │
└─────────────────────────────────────┘
```

## Development Commands

### Backend (FastAPI) Commands

#### Setup and Installation
```bash
# Install dependencies
uv sync

# Install development dependencies
uv sync --dev
```

#### Running the API Server
```bash
# Run development server with auto-reload
uv run uvicorn app.main:app --reload

# Run on specific host/port
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run in production mode
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Chrome Extension Commands

#### Installation
```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable "Developer mode" (top right)

# 3. Click "Load unpacked" and select:
/path/to/pmtools/chrome-extension/

# 4. Pin the extension to toolbar for easy access
```

#### Development Workflow
```bash
# 1. Edit extension files
# 2. Go to chrome://extensions/
# 3. Click refresh icon on PM Tools extension
# 4. Test changes in extension popup

# For background script debugging:
# chrome://extensions/ → PM Tools → "Inspect views: service worker"

# For popup debugging:
# Right-click extension icon → "Inspect popup"
```

### Testing

#### Backend Tests
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

#### Chrome Extension Testing
```bash
# Manual testing checklist:
# ✓ Extension loads without errors
# ✓ Environment auto-detection works
# ✓ Form validation catches errors
# ✓ API calls succeed
# ✓ Results display correctly
# ✓ Auto-scroll to results works
# ✓ Export functionality works
# ✓ Settings save/load properly
# ✓ Tooltips are clickable and accessible
```

### Code Quality
```bash
# Backend code formatting
uv run black app/ tests/

# Sort imports
uv run isort app/ tests/

# Lint code
uv run flake8 app/ tests/

# Type checking
uv run mypy app/
```

## Project Structure

### Backend Structure (`app/`)
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
│   └── calculations.py    # Statistical calculations (TO BE PORTED)
└── llm/
    ├── base.py            # LLM provider interface
    ├── gemini.py          # Google Gemini provider
    ├── anthropic_client.py # Anthropic Claude provider
    ├── manager.py         # LLM manager with fallback
    └── prompts.py         # LLM prompt templates
```

### Chrome Extension Structure (`chrome-extension/`)
```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup/                  # Main popup interface
│   ├── popup.html         # Tabbed UI structure
│   ├── popup.css          # Styling with CSS variables
│   └── popup.js           # Form handling and API calls
├── options/               # Settings page
│   ├── options.html       # User preferences UI
│   ├── options.css        # Settings styling
│   └── options.js         # Preference management
├── background/            # Service worker
│   └── service-worker.js  # Background tasks
├── shared/                # Reusable modules
│   ├── api-client.js      # API communication
│   ├── utils.js           # Utilities + TooltipManager
│   └── constants.js       # Configuration
└── assets/               # Icons and images
    └── icons/            # 16x16, 48x48, 128x128
```

## API Endpoints (Current v1.0)

### POST /validate/setup
Analyzes proposed experiment setup for statistical feasibility.

**Request Structure**:
```json
{
  "hypothesis": "string",
  "metric": {
    "name": "string",
    "baseline_conversion_rate": 0.05
  },
  "parameters": {
    "minimum_detectable_effect_relative": 0.1,  // OR
    "minimum_detectable_effect_absolute": 0.005,
    "statistical_power": 0.8,
    "significance_level": 0.05,
    "variants": 2
  },
  "traffic": {
    "estimated_daily_users": 10000
  }
}
```

**Response**: Sample size per variant, test duration, trade-off matrix, AI hypothesis assessment

### POST /analyze/results
Interprets experiment results with actionable recommendations.

**Request Structure**:
```json
{
  "context": {
    "hypothesis": "string",
    "primary_metric_name": "string",
    "pm_notes": "optional string"
  },
  "results_data": {
    "variants": [
      {
        "name": "Control",
        "users": 5000,
        "conversions": 250
      },
      {
        "name": "Treatment",
        "users": 5000,
        "conversions": 300
      }
    ]
  }
}
```

**Response**: Statistical summary, p-value, confidence intervals, AI interpretation, recommendations

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

## Chrome Extension Features

### 🚀 Recent Updates (June 2025)

#### Auto-Scroll to Results
- Results automatically scroll into view after API responses
- Prevents "hidden results" confusion
- Subtle animation with blue border highlight
- Scroll-to-top buttons (🔝) for easy navigation

#### Simplified Settings
- Removed technical configuration from UI
- Environment auto-detection (local/staging/production)
- Focus on user preferences only
- Zero configuration setup

#### PM-Friendly Interface
- Clickable tooltips with smart positioning
- Helpful, humorous guidance throughout
- Professional copy with relatable scenarios
- Full accessibility support (ARIA, keyboard nav)

### Known Issues
- **AI Follow-up Questions**: Markdown rendering issue where questions appear as run-on text
- **Pattern**: `**Category:** content **Next Category:** content`
- **Status**: Partial fix attempted, needs debugging of actual AI response format

## Key Statistical Concepts

### Core Calculations (To Be Ported to Client-Side)

#### Sample Size Calculation
```python
# Two-proportion z-test formula
n = ((z_alpha + z_beta) / effect_size) ** 2

# Where:
# - z_alpha = Z-score for significance level (e.g., 1.96 for 0.05)
# - z_beta = Z-score for statistical power (e.g., 0.84 for 0.80)
# - effect_size = |p2 - p1| / sqrt(p_pooled * (1 - p_pooled))
```

#### Statistical Significance Testing
```python
# Two-proportion z-test
z_score = (p1 - p2) / sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
p_value = 2 * (1 - norm.cdf(abs(z_score)))
```

### Key Concepts
- **MDE (Minimum Detectable Effect)**: Can be relative (%) or absolute
- **Trade-off Matrix**: Shows duration vs. different MDEs (50%, 75%, 100%, 125%, 150%)
- **Statistical Power**: Default 0.80 (80% chance of detecting true effect)
- **Significance Level**: Default 0.05 (5% false positive rate)
- **Sample Size**: Users needed per variant for reliable results
- **Test Duration**: Days needed based on traffic

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

### Chrome Extension Issues
```bash
# Extension not updating after changes
# 1. Go to chrome://extensions/
# 2. Click refresh icon on PM Tools extension
# 3. Clear extension storage if needed:
#    Right-click icon → Options → Clear all data

# Debugging markdown rendering (AI responses)
# 1. Right-click extension → "Inspect popup"
# 2. Go to Console tab
# 3. Look for formatTextToHTML logs
# 4. Check actual AI response format

# API connection issues from extension
# 1. Check browser console for CORS errors
# 2. Verify API server allows extension origin
# 3. Check network tab for failed requests
```

## 🎯 Next Development Phase: Standalone Chrome Extension

### Vision
Create a fully client-side Chrome extension that requires no server setup:
- All statistical calculations run in JavaScript
- Direct LLM API calls from browser
- User provides their own API keys
- Instant availability for any PM

### Implementation Plan

#### Phase 1: Port Statistical Calculations
1. **Convert Python to JavaScript**:
   - `calculate_sample_size()` - Core sample size formula
   - `calculate_test_duration()` - Duration estimation
   - `generate_tradeoff_matrix()` - MDE scenarios
   - `analyze_experiment_results()` - Significance testing

2. **Ensure Accuracy**:
   - Match Python calculations exactly
   - Use appropriate JS libraries for statistics
   - Comprehensive unit tests
   - Cross-validation with Python results

#### Phase 2: Client-Side LLM Integration
1. **API Key Management**:
   - Secure storage in Chrome extension
   - User-friendly setup flow
   - Support multiple providers

2. **Direct API Calls**:
   - Implement Gemini client
   - Implement Claude client
   - Handle CORS and browser restrictions
   - Fallback mechanisms

#### Phase 3: Enhanced UX
1. **Offline Capabilities**:
   - Statistical calculations always available
   - Cache LLM responses when possible
   - Graceful degradation

2. **Advanced Features**:
   - Export to various formats
   - Calculation history
   - Team sharing capabilities

### Critical Success Factors
1. **Calculation Accuracy**: Must match server-side exactly
2. **PM-Friendly UX**: Maintain current ease of use
3. **Security**: Safe API key handling
4. **Performance**: Fast calculations in browser
5. **Reliability**: Work offline for core features

## Development Workflow

### Working on Both Components
```bash
# Terminal 1: Run API server
uv run uvicorn app.main:app --reload

# Terminal 2: Test API
curl http://localhost:8000/health

# Browser: Load Chrome extension
# chrome://extensions/ → Reload PM Tools

# Test end-to-end flow
# 1. Open extension popup
# 2. Fill validate form
# 3. Submit and verify results
# 4. Check both frontend and backend logs
```

### Best Practices
1. **Maintain Calculation Accuracy**: Statistical formulas are critical
2. **PM-First Design**: Every feature should help PMs make better decisions
3. **Clear Error Messages**: Help PMs understand what went wrong
4. **Progressive Enhancement**: Core features work without LLM
5. **Accessibility**: Full keyboard and screen reader support