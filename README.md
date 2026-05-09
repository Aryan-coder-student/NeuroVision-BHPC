# 🧠 NeuroVision BHPC (Platform 2.0)

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)
[![Django 6.0](https://img.shields.io/badge/django-6.0-green.svg)](https://www.djangoproject.com/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://reactjs.org/)
[![UV Managed](https://img.shields.io/badge/managed%20by-uv-purple.svg)](https://github.com/astral-sh/uv)

NeuroVision is a next-generation clinical AI platform designed for precision neural analytics, featuring multi-tenant isolation and 3D brain tumor segmentation.

## 🏗️ Core Architecture

- **Frontend (`/frontend`)**: React 19 + Vite + NiiVue (3D rendering). Deployed on **Vercel**.
- **Backend (`/backend`)**: Django 6.0 + Django-Tenants. Optimized with **uv**. Designed for **Railway/Render**.
- **Database**: Serverless Postgres on **Neon.tech**.

---

## 🚀 Local Development Setup

We use **`localtest.me`** for local development to support wildcard subdomains (`tenant1.localtest.me`) and shared cookies.

### 1. Prerequisites
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- Node.js & npm

### 2. Environment Variables
Create `.env` files in both directories:

**`backend/platform_api/.env`**:
```env
DEBUG=True
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-32-byte-fernet-key
DATABASE_URL=postgresql://user:pass@host/db
TENANT_BASE_DOMAIN=localtest.me
```

**`frontend/.env`**:
```env
VITE_API_URL=http://localtest.me:8000/api/v1
```

### 3. One-Command Setup
Run the unified setup script from the project root:
```bash
chmod +x setup.sh
./setup.sh
```

---

## ☁️ Deployment Guide

### 1. Database (Neon)
1. Create a project on [Neon.tech](https://neon.tech).
2. Copy the connection string to your backend `.env`.
3. Run migrations and initialize the platform:
   ```bash
   uv run python manage.py migrate_schemas
   uv run python manage.py init_platform
   ```

### 2. Frontend (Vercel)
1. Connect your repo to Vercel.
2. **Root Directory**: `frontend`
3. **Framework Preset**: `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Env Vars**: Add `VITE_API_URL` pointing to your live backend.

### 3. Backend (Railway / Render)
1. Connect your repo.
2. **Root Directory**: `backend`
3. **Build Command**: `uv sync` (or use provided Dockerfile)
4. **Start Command**: `gunicorn platform_api.wsgi`
5. **Env Vars**: Add `DATABASE_URL`, `ENCRYPTION_KEY`, and `DEBUG=False`.

---

## 🛠️ Key Management Commands

| Command | Purpose |
| :--- | :--- |
| `python manage.py init_platform` | Creates the public tenant and domain. |
| `python manage.py migrate_schemas` | Runs migrations for both shared and tenant apps. |
| `python manage.py create_tenant` | Manually creates a new clinical institution schema. |

---
*NeuroVision BHPC — Precision Neural Analytics for the Modern Clinic.*
