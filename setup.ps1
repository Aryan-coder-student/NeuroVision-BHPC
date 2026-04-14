# NeuroVision Unified Setup Script (PowerShell)
# Requirement: uv, npm, podman/docker

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " NeuroVision Unified Initialization   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Orchestrate Containers
Write-Host ""
Write-Host "[1/2] Orchestrating Containers..." -ForegroundColor Green
$ContainerCmd = "podman compose"
if (Get-Command podman-compose -ErrorAction SilentlyContinue) {
    $ContainerCmd = "podman compose"
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $ContainerCmd = "docker-compose"
}

Invoke-Expression "$ContainerCmd up --build -d"

Write-Host ""
Write-Host "Waiting for database to be healthy..." -ForegroundColor Yellow
while ($true) {
    $status = podman inspect -f '{{.State.Health.Status}}' neurovision-db
    if ($status -eq "healthy") { break }
    Start-Sleep -Seconds 2
}

# 2. Database Initialization
Write-Host ""
Write-Host "[2/2] Running Migrations & Initializing Data..." -ForegroundColor Green
podman exec neurovision-backend python manage.py migrate_schemas --shared
podman exec neurovision-backend python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_api.settings')
django.setup()
from tenant.models import Institution, Domain
from users.models import User
tenant, created = Institution.objects.get_or_create(schema_name='public', name='NeuroVision Public', slug='public')
Domain.objects.get_or_create(domain='localhost', tenant=tenant, is_primary=True)
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
print('Public tenant and superuser (admin/admin123) initialized.')
"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Setup Complete!                      " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5174"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Admin:    http://localhost:8000/admin/"
Write-Host "Credentials: admin / admin123"
