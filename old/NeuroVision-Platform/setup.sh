#!/bin/bash
# NeuroVision Project Setup Script
# This script automates the setup of the backend, frontend, and database services.

set -e # Exit on error

echo "======================================"
echo "   NeuroVision Project Setup          "
echo "======================================"

# 1. Start Database & Services
echo ""
echo "[1/4] Starting Database and Services (Postgres, MailHog)..."
if command -v docker compose &> /dev/null; then
    docker compose up -d
elif command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    echo "Error: Docker Compose is not installed."
    exit 1
fi

# 2. Setup Backend
echo ""
echo "[2/4] Setting up Backend (Django)..."
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

cd django_backend
echo "Installing backend dependencies..."
uv sync

# 3. Initialize Database
echo ""
echo "[3/4] Initializing Database (Migrations & Public Tenant)..."
cd platform_api

# Wait for DB to be ready
echo "Waiting for PostgreSQL to be ready on port 5434..."
until nc -z localhost 5434; do
  sleep 1
done

echo "Running migrations..."
uv run python manage.py migrate_schemas --shared

echo "Initializing Public Tenant and Superuser..."
uv run python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_api.settings')
django.setup()
from tenant.models import Institution, Domain
from users.models import User
from django.db import connection

# Ensure we are on public schema for initialization
connection.set_schema_to_public()

tenant, created = Institution.objects.get_or_create(
    schema_name='public', 
    defaults={'name': 'NeuroVision Public', 'slug': 'public'}
)
Domain.objects.get_or_create(
    domain='localtest.me', 
    tenant=tenant, 
    defaults={'is_primary': True}
)
Domain.objects.get_or_create(
    domain='localhost', 
    tenant=tenant, 
    defaults={'is_primary': False}
)

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin / admin123')
else:
    print('Superuser already exists.')

print('Public tenant initialization complete.')
"

# 4. Setup Frontend
echo ""
echo "[4/4] Setting up Frontend (React)..."
cd ../../frontend
if command -v npm &> /dev/null; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Warning: npm not found. Skipping frontend installation."
fi

echo ""
echo "======================================"
echo "        Setup Complete!               "
echo "======================================"
echo "Backend is ready at:  http://localhost:8000"
echo "Frontend is ready at: http://localhost:5174 (Run 'npm run dev' to start)"
echo "Admin Panel:          http://localhost:8000/admin/"
echo "Credentials:          admin / admin123"
echo "======================================"
