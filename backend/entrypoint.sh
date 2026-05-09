#!/bin/bash

# Exit on error
set -e

echo "🏗️  Starting NeuroVision Backend Initialization..."

# Navigate to the platform_api directory
cd platform_api

# Run migrations for all schemas
echo "🔄 Running migrations..."
python manage.py migrate_schemas --noinput

# Initialize the platform (creates public tenant/domain)
echo "🔑 Initializing platform..."
python manage.py init_platform

echo "🚀 Starting Gunicorn..."
exec gunicorn --chdir . --bind 0.0.0.0:8000 --workers 3 platform_api.wsgi:application
