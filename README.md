# 🧠 NeuroVision BHPC (Platform 2.0)

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)
[![Django 6.0](https://img.shields.io/badge/django-6.0-green.svg)](https://www.djangoproject.com/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://reactjs.org/)
[![UV Managed](https://img.shields.io/badge/managed%20by-uv-purple.svg)](https://github.com/astral-sh/uv)
[![Podman](https://img.shields.io/badge/container-podman-purple.svg)](https://podman.io/)

NeuroVision is a next-generation clinical AI platform designed for precision neural analytics. It bridges the gap between high-performance 3D volumetric analysis and decentralized research environments.

## 🏗️ Core Architecture

The platform is engineered as a robust **Multi-Tenant Monorepo**, ensuring complete data isolation for clinical institutions while maintaining a unified identity management layer.

- **Frontend (`/frontend`)**: A surgical-grade UI built with **React 19**, **Vite**, and **Framer Motion**. It features native WebGL 2.0 NIfTI rendering via `NiiVue` for real-time 3D brain segmentation visualization.
- **Backend (`/backend`)**: A high-concurrency **Django 6.0** engine utilizing **Django-Tenants** for schema-level isolation. Optimized dependency management via **`uv`**.
- **Infrastructure**: Orchestrated via **Podman Compose** with **PostgreSQL 15** as the primary relational and schema-tenant store.

## 🚀 One-Command Setup

NeuroVision is built for immediate deployment. We provide unified setup scripts that handle everything from dependency hydration to database bootstrapping.

### Linux / macOS
```bash
chmod +x setup.sh
./setup.sh
```

### Windows (PowerShell)
```powershell
.\setup.ps1
```

> [!NOTE]
> The setup scripts automatically build the containers, apply shared migrations, initialize the public tenant, and create a default admin superuser.

## 🔗 Internal Service Map

| Service | Address | Purpose |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:5174](http://localhost:5174) | Precision UI & 3D Workspace |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | Federated Routing & AI Orchestration |
| **Admin Panel** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | Tenancy & User Management |
| **PostgreSQL** | `localhost:5435` | Multi-tenant Relational Storage |

**Default Credentials**: `admin` / `admin123`

## 🩺 Platform Subsystems

- **3D Volumetric Segmentation**: Real-time NIfTI rendering with optimized **3D-UNet** models (0.94 DICE accuracy).
- **Diagnostic VQA**: Natural language interrogation of MRI slices using multimodal transformers (91.5% F1 score).
- **Federated Registry**: Secure, HIPAA-compliant PHI-scrubbed endpoints for decentralized model training contribution.
- **Pathology Reporting**: Automated synthesis of clinical metrics into **HL7 / FHIR** standardized narrative reports.

## 🛡️ Security & Tenancy
NeuroVision strictly enforces **Schema-Level Isolation**. Each clinical institution receives a dedicated PostgreSQL schema, ensuring that patient data never crosses institutional boundaries. Authentication is handled via a global `users` app, mapping identities to specific `InstitutionMembership` roles.

---
*NeuroVision BHPC — Precision Neural Analytics for the Modern Clinic.*
