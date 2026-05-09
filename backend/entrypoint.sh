#!/bin/bash

# Exit on error
set -e

echo "🏗️  Starting NeuroVision Backend..."

# Navigate to the platform_api directory
cd platform_api

# Run migrations (idempotent)
echo "🔄 Running migrations and collecting static files..."
python manage.py migrate_schemas --noinput
python manage.py collectstatic --noinput

# Initialize/Sync the platform (creates public tenant/domain)
echo "🔑 Initializing platform..."
python manage.py init_platform

# FAIL-SAFE: Create admin inside Render
echo "👤 Creating Render-side admin..."
python manage.py shell -c "from users.models import User; User.objects.filter(username='render_admin').delete(); User.objects.create_superuser(username='render_admin', email='render@neurovision.com', password='password123')"

echo "🚀 Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 platform_api.wsgi:application
