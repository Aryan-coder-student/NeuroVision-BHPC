# NeuroVision Development Skill

This document defines the mandatory development patterns and command-line rules for the NeuroVision platform.

## 🚀 Environment & Commands
- **Mandatory Runner**: ALWAYS use `uv run` for all Python/Django commands.
- **Environment**: All dependencies are managed in the local `.venv`.
- **Primary Commands**:
    - `uv run python manage.py <command>`
    - `uv pip install <package>`

## 🏛️ Architectural Principles
- **Identity Isolation**: The `users` app handles only `User` identity and `InstitutionMembership`.
- **Organisation Isolation**: The `organisations` app handles `Institution` (TenantMixin) and `Domain`.
- **Terminology**: Use **Institution** (Hospitals, Clinics, Research Labs) instead of CRM-focused terms like "Company" or "Client".
- **Multi-Tenant Profile**: Individual hospital profiles live in the `tenant` app (which serves as the "Tenant-Specific" data layer).

## 🛠️ Common Workflows
- **Database Reset**:
    1. `sudo -u postgres dropdb multitenant`
    2. `sudo -u postgres createdb multitenant`
    3. `rm */migrations/0*.py`
    4. `uv run python manage.py makemigrations`
    5. `uv run python manage.py migrate_schemas --shared`
