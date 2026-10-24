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

# Patch the pinned Brotli runtime vulnerability until the lockfile is refreshed.
# Do this after the final uv sync so it cannot reinstall vulnerable Brotli 1.2.0.
RUN uv pip install --python /app/.venv/bin/python --upgrade "brotli==1.2.1" && \\
    /app/.venv/bin/python -c "import importlib.metadata as m; assert m.version('Brotli') == '1.2.1'"

# --- Stage 2: Runtime ---
FROM python:3.13-slim

WORKDIR /app

# Create a non-root user
RUN groupadd -g 1001 python && \
    useradd -m -u 1001 -g python python

# Copy the virtual environment and source code from builder
# Copy only runtime artifacts; exclude builder caches and dependency lock metadata.
COPY --from=builder --chown=python:python /app/.venv /app/.venv
COPY --from=builder --chown=python:python /app/platform_api /app/platform_api
COPY --from=builder --chown=python:python /app/entrypoint.sh /app/entrypoint.sh

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
