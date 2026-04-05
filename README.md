# NeuroVision Precision

The clinical standard for multi-modal neural analytics. NeuroVision provides high-fidelity 3D segmentation via web-enabled U-Net architecture, seamlessly integrated with federated Visual Question Answering (VQA) interfaces.

## 🏗 System Architecture

NeuroVision is engineered as a robust monorepo, decoupling a heavy-duty React presentation layer from a scalable Python backend.

- **Frontend (`/frontend`)**: React 19 + Vite + Framer Motion. Engineered using a brutalist OLED Black "Surgical Monolith" design system with deep GSAP-style parallax constraints. Integrates `NiiVue` for native WebGL 2.0 NIfTI rendering.
- **Backend (`/backend`)**: Django + Django REST Framework. Serves as the primary routing layer for federated datasets, Model Registry endpoints, and AI pipeline orchestration.

## 🚀 One-Click Quickstart

NeuroVision features two deployment topologies to accommodate both local development and containerized scaling.

### Option A: Docker Compose (Recommended)
This approach containerizes both the Django host and the Vite HMR server into an interconnected virtual network.

```bash
docker-compose up --build
```
- **Platform Access**: `http://localhost:5173`
- **Django Admin/API**: `http://localhost:8000`

### Option B: Local Setup Script
If you prefer running services directly via local interpreters, use the hydration script. Ensure you have Python 3.11+ and Node 20+ installed.

```bash
./setup.sh
```

Then, in separate terminal instances:
1. `cd frontend && npm run dev`
2. `cd backend && python manage.py runserver`

## 🩺 Core Modules

- **3D Segmentation Workspace**: Drag-and-drop raw NIfTI scans for immediate inference via local or cloud ML routing. Supports switching between deployed foundational models (e.g., `3D-UNet v2.1`).
- **Diagnostic VQA**: Interrogate MRI slices using natural language queries powered by specialized multimodal transformers (e.g., `BLIP-Med`).
- **Federated Registry**: Participate in decentralized model training cycles by securely committing scrubbed path-data.
- **Model Telemetry Dashboard**: Assess exact accuracy scoring (F1, DICE) of deployed instances across regions.

## 🛡 Security & Extensibility
All interactions mandate multi-tenant authorization hooks. Zero-radius corners are strictly enforced to maintain clinical aesthetic precision. All frontend logic routes to `/backend` schemas via Axios interceptors.
