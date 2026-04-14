#!/bin/bash
# NeuroVision Unified Setup Script (Bash)
# Requirement: uv, npm, podman/docker

echo "======================================"
echo " NeuroVision Unified Initialization   "
echo "======================================"

# 1. Orchestrate Containers
echo ""
echo "[1/2] Orchestrating Containers..."
if command -v podman-compose &> /dev/null; then
    CONTAINER_CMD="podman compose"
elif command -v docker-compose &> /dev/null; then
    CONTAINER_CMD="docker-compose"
else
    CONTAINER_CMD="podman compose" # Fallback guess
fi

$CONTAINER_CMD up --build -d

echo ""
echo "Waiting for database to be healthy..."
until podman inspect -f '{{.State.Health.Status}}' neurovision-db | grep -q "healthy"; do
  sleep 2
done

# 2. Database Initialization
echo ""
echo "[2/2] Running Migrations & Initializing Data..."
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

echo ""
echo "======================================"
echo " Setup Complete!                      "
echo "======================================"
echo "Frontend: http://localhost:5174"
echo "Backend:  http://localhost:8000"
echo "Admin:    http://localhost:8000/admin/"
echo "Credentials: admin / admin123"
