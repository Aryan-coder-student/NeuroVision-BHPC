import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { createPatient, fetchPatients } from '../services/api';
import { validatePatientRegistration } from './patient-form';
import './Patients.css';

const EMPTY_FORM = { patient_code: '', display_name: '' };

function firstMessage(value) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCreatedAt(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Patients() {
  const { org } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const patientCodeRef = useRef(null);
  const displayNameRef = useRef(null);
  const isAdmin = org?.role === 'ADMIN';

  const loadPatients = useCallback(async (signal) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const records = await fetchPatients(org.id, { signal });
      setPatients(records);
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setLoadError('Patient records could not be loaded. Check your connection and try again.');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Patients · NeuroVision';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPatients(controller.signal);
    return () => controller.abort();
  }, [loadPatients]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setFieldErrors(current => ({ ...current, [name]: '' }));
    setSubmitError('');
    setSuccessMessage('');
  };

  const focusFirstInvalidField = (errors) => {
    if (errors.patient_code) patientCodeRef.current?.focus();
    else if (errors.display_name) displayNameRef.current?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || isSaving) return;

    const validation = validatePatientRegistration(form);
    setFieldErrors(validation.errors);
    setSubmitError('');
    setSuccessMessage('');
    if (Object.keys(validation.errors).length > 0) {
      focusFirstInvalidField(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      const patient = await createPatient(org.id, validation.values);
      setPatients(current => [patient, ...current]);
      setForm(EMPTY_FORM);
      setSuccessMessage(`${patient.display_name} was registered with patient ID ${patient.patient_code}.`);
      patientCodeRef.current?.focus();
    } catch (error) {
      const response = error.response?.data;
      const serverFieldErrors = {
        patient_code: firstMessage(response?.patient_code),
        display_name: firstMessage(response?.display_name),
      };
      const hasFieldError = Object.values(serverFieldErrors).some(Boolean);
      if (hasFieldError) {
        setFieldErrors(serverFieldErrors);
        focusFirstInvalidField(serverFieldErrors);
      } else if (error.response?.status === 403) {
        setSubmitError('Only workspace administrators can register patients.');
      } else {
        setSubmitError('The patient could not be registered. Review the details and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="patients-page" aria-labelledby="patients-title">
      <header className="patients-header">
        <div>
          <div className="patients-eyebrow">Clinical registry</div>
          <h1 id="patients-title">Patients</h1>
          <p>{org?.name} · Tenant-isolated patient identities</p>
        </div>
        <div className="patients-count" aria-label={`${patients.length} patient records`}>
          <Users size={16} aria-hidden="true" />
          <strong>{patients.length}</strong>
          <span>records</span>
        </div>
      </header>

      <div className={`patients-layout ${isAdmin ? '' : 'patients-layout-readonly'}`}>
        <div className="patients-panel patients-list-panel">
          <div className="patients-panel-heading">
            <div>
              <h2>Patient registry</h2>
              <p>Records stored in the selected workspace only.</p>
            </div>
            <button
              type="button"
              className="patients-icon-button"
              onClick={() => loadPatients()}
              disabled={isLoading}
              aria-label="Refresh patient registry"
              title="Refresh patient registry"
            >
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            </button>
          </div>

          {loadError && (
            <div className="patients-state patients-state-error" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => loadPatients()}>Try again</button>
            </div>
          )}

          {!loadError && isLoading && (
            <div className="patients-state" role="status">
              <Loader2 size={18} className="spin" /> Loading patient registry…
            </div>
          )}

          {!loadError && !isLoading && patients.length === 0 && (
            <div className="patients-empty">
              <Users size={22} aria-hidden="true" />
              <h3>No patients registered</h3>
              <p>{isAdmin ? 'Use the registration form to add the first patient.' : 'A workspace administrator can add the first patient.'}</p>
            </div>
          )}

          {!loadError && !isLoading && patients.length > 0 && (
            <div className="patients-table-wrap">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th scope="col">Patient ID</th>
                    <th scope="col">Display name</th>
                    <th scope="col">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(patient => (
                    <tr key={patient.id}>
                      <td><code>{patient.patient_code}</code></td>
                      <td className="patients-name">{patient.display_name}</td>
                      <td>{formatCreatedAt(patient.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAdmin ? (
          <aside className="patients-panel patients-form-panel" aria-labelledby="register-patient-title">
            <div className="patients-form-icon"><UserPlus size={18} aria-hidden="true" /></div>
            <h2 id="register-patient-title">Register patient</h2>
            <p className="patients-form-intro">
              Add the minimum identity needed to connect future scans and reports.
            </p>

            {successMessage && <div className="patients-feedback success" role="status">{successMessage}</div>}
            {submitError && <div className="patients-feedback error" role="alert">{submitError}</div>}

            <form className="patients-form" onSubmit={handleSubmit} noValidate>
              <div className="patients-field">
                <label htmlFor="patient-code">Patient ID</label>
                <input
                  ref={patientCodeRef}
                  id="patient-code"
                  name="patient_code"
                  value={form.patient_code}
                  onChange={updateField}
                  maxLength={64}
                  autoComplete="off"
                  placeholder="e.g. P-0042"
                  aria-invalid={Boolean(fieldErrors.patient_code)}
                  aria-describedby={fieldErrors.patient_code ? 'patient-code-error' : 'patient-code-help'}
                />
                <span id="patient-code-help" className="patients-field-help">Unique inside this workspace.</span>
                {fieldErrors.patient_code && <span id="patient-code-error" className="patients-field-error">{fieldErrors.patient_code}</span>}
              </div>

              <div className="patients-field">
                <label htmlFor="patient-display-name">Display name</label>
                <input
                  ref={displayNameRef}
                  id="patient-display-name"
                  name="display_name"
                  value={form.display_name}
                  onChange={updateField}
                  maxLength={160}
                  autoComplete="off"
                  placeholder="Patient display name"
                  aria-invalid={Boolean(fieldErrors.display_name)}
                  aria-describedby={fieldErrors.display_name ? 'patient-display-name-error' : 'patient-display-name-help'}
                />
                <span id="patient-display-name-help" className="patients-field-help">Use the identifier approved by your organization.</span>
                {fieldErrors.display_name && <span id="patient-display-name-error" className="patients-field-error">{fieldErrors.display_name}</span>}
              </div>

              <button type="submit" className="patients-submit" disabled={isSaving} aria-busy={isSaving}>
                {isSaving ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
                <span>{isSaving ? 'Registering…' : 'Register patient'}</span>
              </button>
            </form>

            <div className="patients-privacy-note">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Stored only in the active tenant schema. Do not enter clinical history in these identity fields.</span>
            </div>
          </aside>
        ) : (
          <aside className="patients-panel patients-readonly-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h2>Read-only access</h2>
              <p>You can view this workspace’s patients. Registration is limited to workspace administrators.</p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
