import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Mail, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import PatientEmailVerification from '../components/PatientEmailVerification';
import { useAuth } from '../context/auth-context';
import { createPatient, fetchPatients } from '../services/api';
import { formatIndiaDateTime, indiaCalendarDate } from '../utils/date-time';
import { validatePatientRegistration } from './patient-form';
import './Patients.css';

const EMPTY_FORM = { display_name: '', date_of_birth: '', email: '' };

function firstMessage(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function Patients() {
  const { org } = useAuth();
  const [patients, setPatients] = useState([]);
  const [patientCount, setPatientCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(null);
  const displayNameRef = useRef(null);
  const dobRef = useRef(null);
  const emailRef = useRef(null);
  const isAdmin = org?.role === 'ADMIN';
  const activeVerification = pendingVerification?.workspaceId === org?.id ? pendingVerification : null;

  const loadPatients = useCallback(async (signal, requestedPage = 1) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await fetchPatients(org.id, { page: requestedPage, signal });
      setPatients(result.results || []);
      setPatientCount(result.count || 0);
      setPage(requestedPage);
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
    if (errors.display_name) displayNameRef.current?.focus();
    else if (errors.date_of_birth) dobRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || isSaving || activeVerification) return;

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
      setPage(1);
      void loadPatients(undefined, 1);
      setPendingVerification({
        patient, email: validation.values.email, workspaceId: org.id,
        ...patient.identity_verification,
      });
      setForm(EMPTY_FORM);
      setSuccessMessage('');
    } catch (error) {
      const response = error.response?.data;
      const serverFieldErrors = {
        display_name: firstMessage(response?.display_name),
        date_of_birth: firstMessage(response?.date_of_birth),
        email: firstMessage(response?.email),
      };
      const hasFieldError = Object.values(serverFieldErrors).some(Boolean);
      if (hasFieldError) {
        setFieldErrors(serverFieldErrors);
        focusFirstInvalidField(serverFieldErrors);
      } else if (error.response?.status === 403) {
        setSubmitError('Only workspace administrators can register patients.');
      } else {
        setSubmitError(response?.detail || 'The patient could not be registered. Review the details and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const finishLater = () => {
    if (!activeVerification) return;
    setSuccessMessage('Patient ID ' + activeVerification.patient.patient_code + ' was created. Email is not verified yet; resume from the patient dashboard.');
    setPendingVerification(null);
    displayNameRef.current?.focus();
  };

  const finishVerification = () => {
    setSuccessMessage(activeVerification.patient.display_name + ' (ID ' + activeVerification.patient.patient_code + ') is registered and their email is verified.');
    setPendingVerification(null);
    void loadPatients(undefined, page);
  };

  return (
    <section className="patients-page" aria-labelledby="patients-title">
      <header className="patients-header">
        <div>
          <div className="patients-eyebrow">Clinical registry</div>
          <h1 id="patients-title">Patients</h1>
          <p>{org?.name} · Tenant-isolated patient identities</p>
        </div>
        <div className="patients-count" aria-label={`${patientCount} patient records`}>
          <Users size={16} aria-hidden="true" />
          <strong>{patientCount}</strong>
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
            <>
            <div className="patients-table-wrap">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th scope="col">Patient ID</th>
                    <th scope="col">Display name</th>
                    <th scope="col">Registered</th>
                    <th scope="col"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(patient => (
                    <tr key={patient.id}>
                      <td><code>{patient.patient_code}</code></td>
                      <td className="patients-name">
                        {patient.display_name}
                        <span className="patients-meta">
                          {patient.age == null ? 'Age not available' : patient.age + ' years'}
                          {' · '}
                          {patient.global_identity_id ? 'Email verified' : 'Contact not verified'}
                        </span>
                      </td>
                      <td>{formatIndiaDateTime(patient.created_at)}</td>
                      <td><Link className="patients-open-link" to={`/patients/${patient.id}/dashboard`}>Open <ArrowRight size={12} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="patients-pagination" aria-label="Patient registry pages">
              <button type="button" disabled={isLoading || page === 1} onClick={() => loadPatients(undefined, page - 1)}>Previous</button>
              <span>Page {page} of {Math.max(1, Math.ceil(patientCount / 25))}</span>
              <button type="button" disabled={isLoading || page * 25 >= patientCount} onClick={() => loadPatients(undefined, page + 1)}>Next</button>
            </nav>
            </>
          )}
        </div>

        {isAdmin ? (
          <aside className="patients-panel patients-form-panel" aria-labelledby="register-patient-title">
            <div className="patients-form-icon">{activeVerification ? <Mail size={18} /> : <UserPlus size={18} />}</div>
            <h2 id="register-patient-title">{activeVerification ? 'Verify patient email' : 'Register patient'}</h2>
            <p className="patients-form-intro">
              {activeVerification
                ? 'The patient record has been created. Verify the email to activate its identity link.'
                : 'Enter the patient details. A patient ID is generated automatically and a verification code is emailed.'}
            </p>

            {!activeVerification && successMessage && <div className="patients-feedback success" role="status">{successMessage}</div>}
            {submitError && !activeVerification && <div className="patients-feedback error" role="alert">{submitError}</div>}

            {activeVerification ? (
              <div className="patients-verification">
                <div className="patients-verification-summary">
                  <span className="patients-verification-label">Generated patient ID</span>
                  <strong><code>{activeVerification.patient.patient_code}</code></strong>
                  <span>{activeVerification.patient.display_name}{activeVerification.patient.age == null ? '' : ' · ' + activeVerification.patient.age + ' years'}</span>
                  <span className="patients-verification-label">Email verification pending</span>
                </div>
                <PatientEmailVerification
                  key={activeVerification.challenge_id}
                  workspaceId={org.id}
                  patientId={activeVerification.patient.id}
                  initialChallenge={activeVerification}
                  initialEmail={activeVerification.email}
                  onVerified={finishVerification}
                  onFinishLater={finishLater}
                />
                <p className="patients-field-help">If you leave this page, verification can be restarted from the patient dashboard. Resending is rate-limited.</p>
              </div>
            ) : (
              <form className="patients-form" onSubmit={handleSubmit} noValidate>
                <div className="patients-field">
                  <label htmlFor="patient-display-name">Patient name</label>
                  <input
                    ref={displayNameRef}
                    id="patient-display-name"
                    name="display_name"
                    value={form.display_name}
                    onChange={updateField}
                    maxLength={160}
                    autoComplete="off"
                    placeholder="Patient full name"
                    aria-invalid={Boolean(fieldErrors.display_name)}
                    aria-describedby={fieldErrors.display_name ? 'patient-display-name-error' : 'patient-display-name-help'}
                  />
                  <span id="patient-display-name-help" className="patients-field-help">Use the patient name approved by your organization.</span>
                  {fieldErrors.display_name && <span id="patient-display-name-error" className="patients-field-error" role="alert">{fieldErrors.display_name}</span>}
                </div>

                <div className="patients-field">
                  <label htmlFor="patient-date-of-birth">Date of birth</label>
                  <input
                    ref={dobRef}
                    id="patient-date-of-birth"
                    name="date_of_birth"
                    type="date"
                    max={indiaCalendarDate()}
                    value={form.date_of_birth}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors.date_of_birth)}
                    aria-describedby={fieldErrors.date_of_birth ? 'patient-dob-error' : 'patient-dob-help'}
                  />
                  <span id="patient-dob-help" className="patients-field-help">Age is calculated automatically from the date of birth.</span>
                  {fieldErrors.date_of_birth && <span id="patient-dob-error" className="patients-field-error" role="alert">{fieldErrors.date_of_birth}</span>}
                </div>

                <div className="patients-field">
                  <label htmlFor="patient-email">Patient email</label>
                  <input
                    ref={emailRef}
                    id="patient-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    maxLength={254}
                    autoComplete="email"
                    placeholder="patient@example.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'patient-email-error' : 'patient-email-help'}
                  />
                  <span id="patient-email-help" className="patients-field-help">A verification code will be sent to this address.</span>
                  {fieldErrors.email && <span id="patient-email-error" className="patients-field-error" role="alert">{fieldErrors.email}</span>}
                </div>

                <div className="patients-generated-id-note">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Patient ID is created by NeuroVision. You don't need to enter one.</span>
                </div>
                <button type="submit" className="patients-submit" disabled={isSaving} aria-busy={isSaving}>
                  {isSaving ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
                  <span>{isSaving ? 'Registering…' : 'Register & send code'}</span>
                </button>
              </form>
            )}

            <div className="patients-privacy-note">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Patient records stay in this workspace. Email verification uses the existing encrypted identity service and does not share medical records.</span>
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
