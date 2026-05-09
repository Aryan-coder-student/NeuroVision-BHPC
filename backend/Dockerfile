# Use the official Python slim image
FROM python:3.13-slim

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory for the entire backend
WORKDIR /app

# Install system dependencies (e.g., for psycopg2 if not using binary, but here logic needs it)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy common configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
# Syncing without -e or --no-dev if preferred for production, but here for local dev:
RUN uv sync --frozen

# Set environment paths to use uv's virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Copy the entire platform_api application source
COPY platform_api /app/platform_api

# Change workdir to where manage.py is
WORKDIR /app/platform_api

# Expose Django port
EXPOSE 8000

# Default command (overridden in docker-compose for dev)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
