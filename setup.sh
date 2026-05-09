#!/bin/bash

# NeuroVision Platform Setup Script
# Automates the initialization of Backend and Frontend

echo "🚀 Starting NeuroVision Platform Setup..."

# 1. Backend Setup
echo "📦 Setting up Backend..."
cd backend
if [ ! -f .env ]; then
    echo "⚠️  No .env file found in /backend. Please create it from .env.example"
    exit 1
fi

uv sync
cd platform_api
uv run python manage.py migrate_schemas
uv run python manage.py init_platform

# 2. Frontend Setup
echo "🎨 Setting up Frontend..."
cd ../../frontend
npm install

echo "✅ Setup Complete!"
echo "------------------------------------------------"
echo "To start the platform:"
echo "1. Backend: cd backend/platform_api && uv run python manage.py runserver"
echo "2. Frontend: cd frontend && npm run dev"
echo "3. Visit: http://localtest.me:5174"
echo "------------------------------------------------"
