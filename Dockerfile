# PM Tools API - Production Docker Image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install UV (fast Python package installer)
RUN pip install uv

# Create non-root user for security
RUN groupadd -r pmtools && useradd -r -g pmtools pmtools

# Set work directory
WORKDIR /app

# Create and set permissions for UV cache directory
RUN mkdir -p /home/pmtools/.cache/uv && chown -R pmtools:pmtools /home/pmtools

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY app/ ./app/

# Change ownership to non-root user
RUN chown -R pmtools:pmtools /app

# Switch to non-root user
USER pmtools

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]