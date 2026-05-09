#!/bin/bash

# Exit on error
set -e

echo "🏗️  Starting NeuroVision Backend..."

# Navigate to the platform_api directory
cd platform_api

# Run migrations (idempotent)
echo "🔄 Running migrations..."
python manage.py migrate_schemas --noinput

# Initialize/Sync the platform (creates public tenant/domain)
echo "🔑 Initializing platform..."
python manage.py init_platform

echo "🚀 Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 platform_api.wsgi:application
