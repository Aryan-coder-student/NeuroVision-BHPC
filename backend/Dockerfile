# --- Stage 1: Build ---
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy source code
COPY . .
RUN uv sync --frozen --no-dev

# --- Stage 2: Runtime ---
FROM python:3.13-slim

WORKDIR /app

# Create a non-root user
RUN groupadd -g 1001 python && \
    useradd -m -u 1001 -g python python

# Copy the virtual environment and source code from builder
COPY --from=builder --chown=python:python /app /app

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Switch to non-root user
USER python

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Entrypoint handles migrations and starting gunicorn
ENTRYPOINT ["./entrypoint.sh"]
