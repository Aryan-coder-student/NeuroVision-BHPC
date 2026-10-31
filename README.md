<p align="center">
  <img src="./docs/screenshots/neurovision-platform-preview.gif" width="100%" alt="NeuroVision Docker tour showing login, workspace, VQA, and 3D segmentation" />
</p>

<h1 align="center">NeuroVision</h1>

<p align="center">
  A tenant-isolated workspace for organizing brain-imaging research workflows.
</p>

<p align="center">
  <a href="https://github.com/Aryan-coder-student/NeuroVision-BHPC/actions/workflows/backend-ci.yml"><img src="https://github.com/Aryan-coder-student/NeuroVision-BHPC/actions/workflows/backend-ci.yml/badge.svg" alt="Backend CI status" /></a>
  <a href="https://github.com/Aryan-coder-student/NeuroVision-BHPC/actions/workflows/frontend-ci.yml"><img src="https://github.com/Aryan-coder-student/NeuroVision-BHPC/actions/workflows/frontend-ci.yml/badge.svg" alt="Frontend CI status" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white" alt="Python 3.13" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL 16" /></a>
</p>

> **Research use only.** NeuroVision is not a certified medical device and must not be used to make clinical decisions.

<p align="center"><sub>Local Docker preview with illustrative sample records only.</sub></p>

## Overview

NeuroVision brings patient records, organization-scoped access, and brain-imaging research tools into one workspace. It is designed for teams that need patient context to remain visible while moving between registry, segmentation, visual question answering, history, and reporting workflows.

The platform uses schema-based multi-tenancy: each institution has an isolated database schema, and every tenant request is checked against the authenticated user's active membership before data is accessed.

## Platform capabilities

| Area | Included today |
| --- | --- |
| Identity and access | Registration, email OTP verification, cookie-based JWT authentication, CSRF protection, and workspace membership checks |
| Organization workspaces | Institution selection, tenant-aware routing, owner-scoped workspace and patient access, and cross-workspace patient discovery for authorized users |
| Patient registry | Patient registration, generated identifiers, date-of-birth validation, identity-grant workflow, pagination, search, and tenant-scoped records |
| Imaging workspace | Patient-scoped segmentation viewer, visual question answering, history, reports, model registry, data contribution, and feedback surfaces |
| Delivery | Docker development stack, Render blueprint, and GitHub Actions checks for backend lint/tests, frontend verification, and container security |

## Architecture

```mermaid
flowchart LR
    User[Authorized user] --> Web[React + Vite frontend]
    Web -->|Central API requests| Public[Django public schema]
    Web -->|Workspace header + session| Guard[Membership and tenant middleware]
    Guard --> TenantA[Institution A schema]
    Guard --> TenantB[Institution B schema]
    TenantA --> DB[(PostgreSQL)]
    TenantB --> DB
    Public --> DB
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React 19, Vite, React Router, NiiVue | Browser application, workspace navigation, and imaging interfaces |
| API | Django 6, Django REST Framework | Authentication, API endpoints, patient workflows, and validation |
| Tenancy | django-tenants + PostgreSQL schemas | Institution isolation and member-authorized tenant resolution |
| Data | PostgreSQL 16 | Public identity data and isolated institution data |
| Delivery | Docker, Render, Vercel-compatible static build | Local services and production deployment paths |

## Repository layout

```text
.
├── backend/
│   ├── platform_api/
│   │   ├── clinical/       # Patient records and identity-grant workflows
│   │   ├── tenant/         # Institutions, memberships, and tenant resolution
│   │   ├── users/          # Registration, OTP, and authentication
│   │   └── platform_api/   # Django settings and API routing
│   └── Dockerfile
├── frontend/
│   ├── src/components/     # Shared application shell and patient context
│   ├── src/pages/          # Research workspace screens
│   └── src/services/       # API and tenant URL boundaries
├── docker-compose.yml
├── render.yaml
└── UX-CONTRACT.md          # Product and interaction constraints
```

## Quick start

### Prerequisites

- Docker Desktop and Docker Compose, or:
  - Python 3.13 with [uv](https://docs.astral.sh/uv/)
  - Node.js 22 and npm
  - PostgreSQL 16

### 1. Configure the environment

Create the Docker Compose environment file from the tracked example:

```bash
cp backend/.env.example backend/.env
```

For Docker Compose, use this local database URL in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/neurovision
```

Keep the remaining values from the example, and replace development secrets before any shared deployment. The frontend defaults to the local central API; copy its example if you need to override it:

```bash
cp frontend/.env.example frontend/.env
```

For a direct Django run instead of Docker Compose, the backend settings loader reads its environment file from `backend/platform_api/.env`:

```bash
cp backend/.env.example backend/platform_api/.env
```

### 2. Start the stack

```bash
docker compose up --build
```

The application will be available at:

- Frontend: `http://localtest.me:5174`
- API: `http://localtest.me:8000/api/v1`
- MailHog inbox: `http://localhost:8025`

The backend entrypoint applies tenant migrations, collects static files, and initializes the public platform tenant. `localtest.me` resolves to `127.0.0.1`, allowing local wildcard subdomain and cookie behavior to match the tenant model.

To stop the services while retaining the database volume:

```bash
docker compose down
```

### Run without Docker

Set `DATABASE_URL` in `backend/.env` to a running local PostgreSQL database, then install and initialize each application:

```bash
./setup.sh
```

Run the backend and frontend in separate terminals:

```bash
cd backend/platform_api
uv run python manage.py runserver
```

```bash
cd frontend
npm run dev
```

## Development commands

Run these from the indicated directory.

| Area | Command | Purpose |
| --- | --- | --- |
| Backend | `uvx ruff==0.15.12 check .` | Lint Python source |
| Backend | `uv run python manage.py test users.auth.tests tenant.tests clinical.tests --noinput` | Run backend test suite |
| Frontend | `npm run lint` | Lint frontend source |
| Frontend | `npm test` | Run frontend unit tests |
| Frontend | `npm run build` | Create the production bundle |

## Design patterns and engineering boundaries

NeuroVision is a modular monolith with explicit boundaries around identity, tenancy, clinical records, and browser state. The project favors small, visible patterns over framework-heavy abstractions.

| Pattern | Where it is applied | Why it matters |
| --- | --- | --- |
| Feature-oriented modular monolith | `users`, `tenant`, `clinical`, and patient-identity modules | Keeps related models, API rules, and tests together while retaining a single deployable service. |
| Application service layer | `users.auth.service.UserService` and `clinical.services` | Moves multi-step business workflows out of views so they are testable, transactional where required, and reusable. |
| Read/write representation split (CQRS-lite) | `PatientReadSerializer`, `PatientWriteSerializer`, and `PatientRegistrationSerializer` | Separates API output from allowed mutations; generated identifiers, identity links, and timestamps cannot be silently written by clients. |
| Schema-per-tenant isolation | `django-tenants` institutions and PostgreSQL schemas | Keeps each institution's clinical records physically separated at the database layer. |
| Policy-enforcement middleware | `WorkspaceTenantMiddleware` | Authenticates the request and verifies active workspace membership before switching PostgreSQL tenant context. |
| Compensating transaction | Patient registration and identity-grant workflow | Removes the newly created patient and public identity-grant artifacts if the OTP grant cannot be started, avoiding partial onboarding state. |
| Explicit client state ownership | `AuthProvider` for session/workspace state and `PatientWorkspace` for patient scope | Gives each state concern one owner and prevents a selected workspace or patient from being inferred implicitly. |
| UTC storage and presentation policy | Django-aware timestamps; patient calendar rules | Stores instants in UTC and keeps date-only patient fields as calendar values, with user-facing date presentation following the documented India timezone convention. |

### Segmentation sample walkthrough

From a patient workspace, open **Segmentation**, leave **BraTS 2021 sample** selected,
and press **Run AI Segmentation**. The bundled T1CE MRI and reference segmentation
mask load in NiiVue. Use **MRI + mask**, **Original MRI**, **Segmentation mask**, or
**3D overlay** to inspect the same volume without fetching it again.

This is a research reference preview, **not AI inference**: no model prediction
is made, no patient study is uploaded, and no patient result or report is saved.
The separate **Patient study (experimental)** option still requires a locally
running Flask `/predict` service, but the browser now reaches it only through
the tenant-authorized Django inference API.

### Separate inference capability modules

Backend inference modules live in `backend/platform_api/ai_providers/`:

- `segmentation/` owns the MONAI 3D UNet request contract, serializer, adapter, and view.
- `vqa/` owns the BLIP question + image contract, serializer, adapter, and view.

Only model catalog/selection, transport, configuration, tenant permissions,
response formatting and provider error handling are shared. Both task views
inherit a single patient-scoped request lifecycle from `PatientInferenceView`.
No second provider service or job queue is introduced by this refactor.

### AI provider registry

The Django provider registry exposes the existing MONAI 3D UNet and fine-tuned BLIP models through patient-scoped endpoints. The catalog reports configuration and version metadata only; it does not claim that a provider is live until an inference request succeeds.

| Pattern | Implementation | Boundary it protects |
| --- | --- | --- |
| Provider interfaces | `SegmentationProvider` and `VQAProvider` accept validated capability-specific requests. | Keeps Django views and React independent of inference transports. |
| Provider adapters | `MonaiSegmentationAdapter` targets a multipart file endpoint; `BlipVQAAdapter` preserves the FastAPI multipart contract. | Contains provider URLs, tokens, timeouts, and vendor payloads server-side. |
| Model catalog and registry | The settings-backed catalog maps stable model IDs to versions and configured adapters. | Makes future providers additive without exposing invented models or browser-selected endpoints. |

Inference responses are returned to the caller but are not persisted as clinical records. This change accepts **transient multipart MRI input** at the authenticated Django boundary, but does not persist imaging studies, model results, or reports. The upstream MONAI Flask `POST /predict/files` does **not exist in the current model repository**. Segmentation is disabled by default (`MONAI_SEGMENTATION_UPLOAD_ENABLED=False`) until the independent model service implements authenticated multipart inference that returns `mask_nifti_base64` (not a server filesystem path), with native MRI geometry and model provenance verified. The frontend's folder selector in PR #31 only previews inputs; no predictions are faked. No Celery, Redis or new infrastructure is introduced.

## API and tenant model

The central API is exposed under `/api/v1`:

```text
/api/v1/auth/             Authentication, OTP, profile, and CSRF endpoints
/api/v1/workspaces/       Institution discovery and management
/api/v1/my-patients/      Authorized cross-workspace patient discovery
/api/v1/tenant/context/   Current workspace context
/api/v1/tenant/patients/  Tenant-scoped patient records and identity grants
/api/v1/tenant/models/    Configured model catalog and version metadata
/api/v1/tenant/patients/:id/inference/  Patient-authorized inference proxy
```

Tenant-scoped routes require an authenticated user and an `X-Workspace-Id` that resolves to one of that user's active memberships. Requests that are unauthenticated, missing workspace context, or target an unauthorized workspace are rejected before tenant data is selected.

## Deployment

`render.yaml` provides a Render blueprint for the Dockerized Django backend and static Vite frontend. Set deployment secrets in the hosting provider rather than committing them:

- `DATABASE_URL`
- `SECRET_KEY`
- `ENCRYPTION_KEY`
- `TENANT_BASE_DOMAIN`
- `VITE_API_URL`
- `MONAI_SEGMENTATION_BASE_URL`, timeout, token, model version and `MONAI_SEGMENTATION_UPLOAD_ENABLED` flag (false until verified upstream support)
- `BLIP_VQA_BASE_URL`, timeout, optional API token, and model version

The frontend can also be deployed as a Vite static application on Vercel-compatible platforms. Use `frontend` as the project root, `npm run build` as the build command, and `dist` as the output directory.

## Security and data boundaries

- Institution data is separated by PostgreSQL schema.
- Tenant selection is constrained by authenticated, active membership.
- Authentication uses HTTP-only cookies with CSRF enforcement for unsafe requests.
- Patient identity linking is an explicit OTP-verified flow.
- Production deployments must use provider-managed secrets, TLS, and a production database; development values in `.env.example` are not safe defaults for production.

Report security issues privately. Do not include credentials, patient data, or sensitive reproduction material in public issues.

## Project status

NeuroVision is actively evolving as a brain-imaging research platform. The codebase includes research-facing imaging workflows alongside core patient and workspace operations; persistent clinical reporting is still in development.

## License

No license file is currently included in this repository. Add an explicit license before redistributing or accepting external contributions under defined terms.


### Private segmentation reports in Hugging Face Storage Buckets

This PR supports two storage modes using one Django `FileField`:

- `NEUROVISION_REPORT_STORAGE=filesystem`: local Docker development, with
  `report_media` Docker volume; not durable on Render Free.
- `NEUROVISION_REPORT_STORAGE=huggingface`: private S3-compatible
  [pahariaryan/neuro-bucket](https://huggingface.co/buckets/pahariaryan/neuro-bucket).
  The S3 endpoint is `https://s3.hf.co/pahariaryan`; the S3 API bucket name is
  **`neuro-bucket`**, not `pahariaryan/neuro-bucket`.

For the hosted demo, generate *S3 credentials* from a fine-grained Hugging Face
write-capable access token scoped to this bucket. On Render backend environment,
add `NEUROVISION_REPORT_STORAGE=huggingface`,
`HUGGINGFACE_S3_NAMESPACE=pahariaryan`,
`HUGGINGFACE_S3_BUCKET=neuro-bucket`,
`HUGGINGFACE_S3_ACCESS_KEY_ID=HFAK...`, and
`HUGGINGFACE_S3_SECRET_ACCESS_KEY=<secret>`. Never commit secrets, copy
them into the React frontend, or paste them into issues. A regular Hugging Face
token is **not** the S3 secret key. The gateway requires path-style addressing,
region `us-east-1`, and request/response checksum mode `when_required`.

Each report object is stored as
`reports/<workspace-name>-<workspace-uuid>/<patient-name>-<patient-uuid>/<report-uuid>/3d-segmentation.png`
in the **private bucket**. PostgreSQL stores only its relative object key and
report metadata. Raw MRI and masks are never retained. All reads stream through
the existing authenticated, tenant-scoped snapshot route; the object URL
is never returned by Django and no public media route is created.
Report deletion calls storage.delete after the transaction commits.

**Privacy:** Workspace and patient names appear in the object key. Use only
de-identified or synthetic/demo research data until PHI governance,
retention, consent, applicable legal requirements and a signed data-processing
agreement have been reviewed. For real patients, move to opaque-only object
keys and an approved medical-data storage contract.

**Deployment:** Render Free does not provide durable local media volumes.
With the Hugging Face mode and secret env vars configured, uploads persist in
the bucket across Render redeploys. Without keys the app deliberately rejects
saves rather than falling back to unsafe ephemeral storage. Local development
continues using the Docker named volume by default. Storage Gateway access
still needs validation via an authenticated upload/read/delete smoke test against
the actual private bucket.

### Private segmentation report media (PR #35)

Segmentation report snapshots are **files on the Django backend filesystem**, not
binary columns in PostgreSQL. Only the file's relative path and report metadata
live in tenant PostgreSQL. Saved images are grouped by readable, slugified names
plus IDs (IDs prevent duplicate names from colliding):

```text
backend/platform_api/media/
  reports/
    <workspace-name>-<workspace-uuid>/
      <patient-name>-<patient-uuid>/
        <report-uuid>/
          3d-segmentation.png
```

The upload's original filename is discarded. Names in these filesystem paths
are still sensitive patient data; do not make this directory public or log its
paths to third-party services. Filenames remain based on the names at report
creation time if patient/workspace names are later changed.

`NEUROVISION_MEDIA_ROOT` optionally selects the root directory; by default it
is `backend/platform_api/media`. Docker Compose persists report images in the named `report_media` volume and
sets `NEUROVISION_MEDIA_ROOT=/app/platform_api/media`.

Only when using the **filesystem mode** on a deployed backend, **mount a persistent
volume and set `NEUROVISION_MEDIA_ROOT` to its mount path**, e.g.
`/var/data/neurovision-media` on a disk-equipped Render service. Without a
persistent mounted disk, redeploys/instance replacement can permanently lose
the PNGs even though PostgreSQL retains report metadata. Multiple instances
must share the same private storage. A future object-storage backend can be
plugged into the file storage abstraction if needed.

No `/media/` public route is registered. The private storage backend refuses
direct `.url` access. The web UI fetches images via the existing authenticated,
tenant-scoped report snapshot endpoint, and tenant Django Admin offers a staff-only
preview. The admin deliberately does **not** permit adding/editing inferred reports,
which must pass signed inference-proof checks. Database deletions clean up report
files after the transaction commits. Original MRI and interactive NIfTI masks
remain transient.

The existing `render.yaml` backend uses `plan: free`, **which has no configured
persistent disk**; this PR intentionally does not upgrade or bill a paid Render
plan. To preserve reports in Render production, either configure the Hugging Face
private S3 bucket as described above (recommended for the synthetic demo),
or switch to a disk-capable plan and mount a persistent disk for filesystem mode.
Never use ephemeral Render Free filesystem storage for durable reports.

### Private research MRI contributions (PR #37)

The **Data Contribution** page uploads real research MRI data to a private
Hugging Face Storage Bucket. Supported inputs (one submission per dataset):

- **BraTS NIfTI:** T1, T1CE, T2 and FLAIR, each `.nii` or `.nii.gz`.
- **DICOM ZIP:** one `.zip` containing 1–512 DICOM Part-10 `.dcm` files;
  symlinks, traversal paths, encrypted members and excessive expanded sizes
  are rejected.

Each uploaded object is currently limited to **32 MiB**, because uploads pass
through the synchronous Render backend. For large datasets, implement
resumable direct-to-bucket uploads separately. NIfTI headers and DICOM ZIP
member signatures are validated, but **this does not de-identify scans or
guarantee the absence of PHI**. Upload only synthetic/public or otherwise
verified de-identified research volumes for which storage rights exist.
The free HF bucket is not represented as an approved clinical PHI store.

On the **Render backend** set:
```env
NEUROVISION_REPORT_STORAGE=huggingface
HUGGINGFACE_S3_NAMESPACE=pahariaryan
HUGGINGFACE_S3_BUCKET=neuro-bucket
HUGGINGFACE_S3_ACCESS_KEY_ID=<HF generated S3 access key>
HUGGINGFACE_S3_SECRET_ACCESS_KEY=<HF generated S3 secret>
```
Keep credentials private; never commit them or expose them in the frontend.
The dataset object keys look like:
`contributions/<workspace-uuid>/<contribution-uuid>/<modality>.nii.gz`
or `contributions/<workspace-uuid>/<contribution-uuid>/dicom_archive.zip`.
Incoming original filenames and patient identifiers do **not** enter object keys.
The database stores the contribution's metadata and private object references,
not MRI bytes. No public download URLs are exposed. The existing reports stay
under a separate `reports/` prefix in the same private bucket.

The submission is recorded as **uploaded** only after the private objects have
been written; successful uploads are immediately listed in "My uploaded
datasets". Admin review is optional for research-use governance and does not
imply an ML training job or HIPAA compliance. If the bucket is not configured,
the endpoint responds **503** rather than silently storing on Render's
ephemeral disk. No GPU training pipeline is started.
