# Patient Workspace UX Contract

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select | `DESIGN.md` and `premium-ui.json` | Platform-owned popup accepted | Keyboard selection and browser smoke test |
| Form | Page form with shared field tokens | `DESIGN.md` form contract | Identity OTP and patient registration | Inline errors, first-invalid focus, duplicate-submit check |
| Scrollbar | Global document theme | `frontend/src/index.css` | Stable gutter on tables/tabs | Strict audit and browser overflow check |
| CRUD | Tenant patient API and registry | `clinical.views.PatientViewSet` | Admin writes, member reads | Tenant isolation integration tests |
| Cross-workspace patient directory | Central My Patients route | `tenant.patient_views.MyPatientsView` | Search, workspace filter, pagination | Active-membership integration tests |

## Scope invariants

- Organization selection happens before patient selection.
- The central `/my-patients` directory is available before organization selection and aggregates only active member workspaces.
- Opening a central patient verifies and selects that patient’s workspace before handing off to the existing patient detail route.
- Segmentation, VQA, scan history, and reports require a patient ID in the URL: `/patients/:patientId/...`.
- The backend resolves that patient inside the selected tenant schema. A patient ID from another tenant returns unavailable and must not fall back to another record.
- Switching patient or organization creates a new workspace context. In-memory VQA and segmentation state is not reused across that boundary.
- History and reports show an honest empty state until their patient-scoped persistence APIs exist; demo data is never presented as a clinical record.

## Identity grant

- Email OTP proves control of an email contact. It does not prove legal identity.
- Only organization administrators may start or verify a grant; members may read its status.
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
