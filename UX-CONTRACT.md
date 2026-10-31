# Patient Workspace UX Contract

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select | `DESIGN.md` and `premium-ui.json` | Platform-owned popup accepted | Keyboard selection and browser smoke test |
| Date | Native date input | `DESIGN.md` and `premium-ui.json` | Platform calendar and locale accepted | India calendar-date boundary and browser smoke test |
| Form | Page form with shared field tokens | `DESIGN.md` form contract | Identity OTP and patient registration | Inline errors, first-invalid focus, duplicate-submit check |
| Scrollbar | Global document theme | `frontend/src/index.css` | Stable gutter on tables/tabs | Strict audit and browser overflow check |
| CRUD | Tenant patient API and registry | `clinical.views.PatientViewSet` | Workspace ownership plus active membership for reads and writes | Tenant isolation integration tests |
| Cross-workspace patient directory | Central My Patients route | `tenant.patient_views.MyPatientsView` | Search, workspace filter, pagination | Active-membership integration tests |

## Scope invariants

- Server timestamps are timezone-aware UTC instants. Patient-facing timestamps are rendered explicitly in `Asia/Kolkata`, independent of the browser timezone.
- Date of birth is a calendar date (`YYYY-MM-DD`), not an instant; it is never timezone-converted. Its validation boundary uses the India calendar day.
- Every patient read model carries a monotonically increasing version. Demographic updates submit the version they were based on; a stale update returns `409 Conflict` with the current record and never overwrites it.
- Every material name/DOB correction atomically appends a tenant-scoped audit event containing the actor ID and username snapshot, changed fields, before/after values, record versions, and a UTC timestamp. No-op saves do not create events. Audit events are append-only and follow the patient record's existing deletion lifecycle.
- Organization selection happens before patient selection.
- The central `/my-patients` directory is available before organization selection and aggregates only active member workspaces.
- Opening a central patient verifies and selects that patient’s workspace before handing off to the existing patient detail route.
- Segmentation, VQA, scan history, and reports require a patient ID in the URL: `/patients/:patientId/...`.
- The backend resolves that patient inside the selected tenant schema. A patient ID from another tenant returns unavailable and must not fall back to another record.
- Switching patient or organization creates a new workspace context. In-memory VQA and segmentation state is not reused across that boundary.
- History and reports list only signed, patient-scoped inference summaries with static PNG snapshots; BraTS reference demos are browser-only previews and never persisted as patient inference or clinical records.

## Identity grant

- Email OTP proves control of an email contact. It does not prove legal identity.
- Only the authenticated workspace owner with an active membership may start, verify or read patient contact grants.
- A verified global identity may have separate grants in multiple organizations. Those grants do not share clinical records.
- The client receives only a masked email destination, challenge ID, expiry, status, and verification timestamp. Raw email is encrypted at rest and is not returned by grant APIs.
- A verified patient link cannot be silently replaced with another email.
- Report delivery is a future, separately consented operation. Verification alone does not authorize sending records.
- Phone OTP and Aadhaar/ABHA are future provider integrations. The current UI does not collect or store Aadhaar identifiers.

## Interaction behavior

- Mutations are pessimistic: buttons remain stable, show busy state, and block duplicate submission until the server responds.
- Forms use app-owned validation with inline errors and focus the first invalid field.
- Loading, unavailable, empty, read-only, error, and verified states remain explicit in the owning panel.
- Native select popup appearance is accepted for the current model pickers; the project does not claim authored popup geometry.


#### Private report images
- Segmentation report PNGs use Django `FileField`, not PostgreSQL binary values.
- Media is stored under `reports/<workspace-name>-<uuid>/<patient-name>-<uuid>/<report-uuid>/3d-segmentation.png`; original upload filenames are never trusted.
- Workspace/patient names in paths are sensitive. Keep the entire `MEDIA_ROOT` private; use authenticated tenant snapshot GET / staff-only admin preview, never a public media URL.
- Development defaults to `backend/platform_api/media/`; on Render set `NEUROVISION_MEDIA_ROOT` to a persistent mounted disk path or the filesystem will be ephemeral.
- Models Patient, ImagingStudy, SegmentationReport are registered read-only in tenant Django Admin to preserve API validation and audit rules.
