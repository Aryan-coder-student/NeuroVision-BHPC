# NeuroVision Project Setup Script (PowerShell)
# This script automates the setup of the backend, frontend, and database services.

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   NeuroVision Project Setup          " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Start Database & Services
Write-Host ""
Write-Host "[1/4] Starting Database and Services (Postgres, MailHog)..." -ForegroundColor Green
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose up -d
} else {
    Write-Error "Docker is not installed or not in PATH."
}

# 2. Setup Backend
Write-Host ""
Write-Host "[2/4] Setting up Backend (Django)..." -ForegroundColor Green
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "uv not found. Please install uv from https://astral.sh/uv" -ForegroundColor Red
    exit 1
}

Set-Location backend
Write-Host "Installing backend dependencies..." -ForegroundColor Gray
uv sync

# 3. Initialize Database
Write-Host ""
Write-Host "[3/4] Initializing Database (Migrations & Public Tenant)..." -ForegroundColor Green
Set-Location platform_api

Write-Host "Running migrations..." -ForegroundColor Gray
uv run python manage.py migrate_schemas --shared

Write-Host "Initializing Public Tenant and Superuser..." -ForegroundColor Gray
uv run python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_api.settings')
django.setup()
from tenant.models import Institution, Domain
from users.models import User
from django.db import connection

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

print('Public tenant initialization complete.')
"

# 4. Setup Frontend
Write-Host ""
Write-Host "[4/4] Setting up Frontend (React)..." -ForegroundColor Green
Set-Location ../../frontend
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    npm install
} else {
    Write-Host "Warning: npm not found. Skipping frontend installation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "        Setup Complete!               " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Backend is ready at:  http://localhost:8000"
Write-Host "Frontend is ready at: http://localhost:5174 (Run 'npm run dev' to start)"
Write-Host "Admin Panel:          http://localhost:8000/admin/"
Write-Host "Credentials:          admin / admin123"
Write-Host "======================================" -ForegroundColor Cyan
