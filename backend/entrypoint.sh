#!/bin/bash

# Exit on error
set -e

# Industry standard: Entrypoint only starts the process
# Migrations are now handled by Render preDeployCommand
echo "🚀 Starting NeuroVision Backend..."

cd platform_api
exec gunicorn --bind 0.0.0.0:8000 --workers 3 platform_api.wsgi:application
