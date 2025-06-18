# PM Tools - A/B Testing API

A headless A/B Testing Validation & Analysis API designed to serve as a statistical consultant for Product Managers.

## Features

- **Pre-Experiment Feasibility Calculator**: Validates experiment design and calculates statistical feasibility
- **Post-Experiment Results Interpreter**: Interprets raw experiment data with LLM-powered insights
- **LLM Integration**: Supports Google Gemini and Anthropic Claude with fallback
- **Statistical Analysis**: Sample size calculations, significance testing, and trade-off matrices
- **Segmented Analysis**: Analyze results across different user segments

## Quick Start

### Option 1: API Only

1. **Install dependencies:**
   ```bash
   uv sync --dev
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run the API server:**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

4. **Access API docs:**
   Visit `http://localhost:8000/docs`

### Option 2: With Streamlit GUI

1. **Install API dependencies:**
   ```bash
   uv sync --dev
   ```

2. **Install Streamlit dependencies:**
   ```bash
   pip install -r streamlit_app/requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and model preferences
   ```

4. **Start the API server:**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

5. **Start the Streamlit app (in a new terminal):**
   ```bash
   cd streamlit_app
   streamlit run main.py
   ```

6. **Access the web interface:**
   Visit `http://localhost:8501`

## API Endpoints

- `POST /validate/setup` - Analyze experiment setup for statistical feasibility
- `POST /analyze/results` - Interpret experiment results with actionable insights
- `GET /health` - Health check endpoint

## Development

Run tests:
```bash
uv run pytest
```

Format code:
```bash
uv run black .
uv run isort .
```

## Features

### Web Interface (Streamlit)
- **Interactive Dashboard**: User-friendly interface for all features
- **Setup Validation**: Form-based experiment design with real-time feedback
- **Results Analysis**: Upload data or input manually for comprehensive analysis
- **Visualizations**: Charts and graphs for better data understanding
- **Export Options**: Download results as JSON for further analysis

### API Interface
- **RESTful API**: Headless operation for integration with other tools
- **Auto Documentation**: Interactive API docs at `/docs`
- **JSON Responses**: Structured data for programmatic access

## Architecture

The application is designed with complete separation between the API and GUI:

- **FastAPI Backend** (`app/`): Core statistical and LLM functionality
- **Streamlit Frontend** (`streamlit_app/`): Optional web interface
- **Independent Operation**: API works standalone, GUI can be removed easily
- **HTTP Communication**: No shared dependencies between frontend and backend

## Removing the GUI

To deploy API-only (without Streamlit):
1. Delete the `streamlit_app/` directory
2. Deploy only the FastAPI application
3. No changes needed to the core API code

## LLM Configuration

The API supports both Google Gemini and Anthropic Claude with configurable models:

### Supported Models
- **Google Gemini**: `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`
- **Anthropic Claude**: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`

### Environment Variables
```bash
# API Keys
GOOGLE_API_KEY=your_google_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Model Selection
GEMINI_MODEL=gemini-2.5-flash
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Provider Settings
DEFAULT_LLM_PROVIDER=gemini
LLM_FALLBACK_ENABLED=true
```

### Testing LLM Setup
```bash
# Check provider status
curl http://localhost:8000/llm/status

# Expected response:
{
  "available_providers": ["gemini"],
  "default_provider": "gemini", 
  "gemini_model": "gemini-2.5-flash",
  "anthropic_model": "claude-sonnet-4-20250514"
}
```

## Troubleshooting

### Common LLM Issues
- **"404 models/gemini-pro is not found"**: Update `GEMINI_MODEL` to `gemini-2.5-flash`
- **"Invalid API key"**: Verify your API keys in `.env`
- **"No LLM providers available"**: Ensure at least one valid API key is configured
- **LLM assessment shows fallback**: Check `/llm/status` endpoint for provider availability

### Development Issues
- **Import errors**: Run `uv sync --dev` to reinstall dependencies
- **Streamlit not connecting**: Ensure FastAPI server is running on port 8000
- **Cache issues**: Clear Python cache with `find . -name "*.pyc" -delete`

## Requirements

- Python 3.9+
- Google Gemini API key (optional)
- Anthropic Claude API key (optional)
- For GUI: Streamlit, Pandas, Plotly