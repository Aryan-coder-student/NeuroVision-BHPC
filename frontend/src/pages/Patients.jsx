import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { createPatient, fetchPatients, requestPatientGrant, verifyPatientGrant } from '../services/api';
import { validatePatientRegistration, validPatientOtp } from './patient-form';
import './Patients.css';

const EMPTY_FORM = { display_name: '', date_of_birth: '', email: '' };

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
  const [pendingVerification, setPendingVerification] = useState(null);
  const [otp, setOtp] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const displayNameRef = useRef(null);
  const dobRef = useRef(null);
  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const isAdmin = org?.role === 'ADMIN';
  const activeVerification = pendingVerification?.workspaceId === org?.id ? pendingVerification : null;

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
      setPatients(current => [patient, ...current]);
      setPendingVerification({
        patient, email: validation.values.email, workspaceId: org.id,
        ...patient.identity_verification,
      });
      setForm(EMPTY_FORM);
      setOtp('');
      setVerificationError('');
      setVerificationNotice('');
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


  const verifyEmail = async (event) => {
    event.preventDefault();
    if (!activeVerification || isVerifying || isResending) return;
    if (!validPatientOtp(otp)) {
      setVerificationError('Enter the six-digit verification code.');
      otpRef.current?.focus();
      return;
    }
    if (!activeVerification.challenge_id) {
      setVerificationError('Request a new verification code to continue.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');
    setVerificationNotice('');
    try {
      await verifyPatientGrant(org.id, activeVerification.patient.id, activeVerification.challenge_id, otp);
      setPendingVerification(null);
      setOtp('');
      setSuccessMessage(activeVerification.patient.display_name + ' (ID ' + activeVerification.patient.patient_code + ') is registered and their email is verified.');
      void loadPatients();
    } catch (error) {
      setVerificationError(error.response?.data?.detail || 'The code could not be verified. Check it and try again.');
      otpRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    if (!activeVerification || isVerifying || isResending) return;
    setIsResending(true);
    setVerificationError('');
    setVerificationNotice('');
    try {
      const challenge = await requestPatientGrant(org.id, activeVerification.patient.id, activeVerification.email);
      setPendingVerification(current => ({ ...current, ...challenge }));
      setOtp('');
      setVerificationNotice('A new code was sent. Please check the patient’s email.');
      otpRef.current?.focus();
    } catch (error) {
      setVerificationError(error.response?.data?.detail || 'Could not resend the code. Try again.');
    } finally {
      setIsResending(false);
    }
  };

  const finishLater = () => {
    if (!activeVerification || isVerifying || isResending) return;
    setSuccessMessage('Patient ID ' + activeVerification.patient.patient_code + ' was created. Email is not verified yet; resume from the patient dashboard.');
    setPendingVerification(null);
    setOtp('');
    setVerificationError('');
    setVerificationNotice('');
    displayNameRef.current?.focus();
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
                      <td>{formatCreatedAt(patient.created_at)}</td>
                      <td><Link className="patients-open-link" to={`/patients/${patient.id}/dashboard`}>Open <ArrowRight size={12} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <form className="patients-form" onSubmit={verifyEmail} noValidate>
                  <div className="patients-field">
                    <label htmlFor="patient-otp">6-digit verification code</label>
                    <input
                      ref={otpRef}
                      id="patient-otp"
                      name="otp"
                      className="patients-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={event => { setOtp(event.target.value.replace(/\D/g, '')); setVerificationError(''); }}
                      aria-invalid={Boolean(verificationError)}
                      aria-describedby="patient-otp-help"
                      placeholder="000000"
                      disabled={isVerifying || isResending}
                    />
                    <span id="patient-otp-help" className="patients-field-help">
                      Sent to {activeVerification.masked_email || 'the patient’s email'}.
                      The code expires in 10 minutes.
                    </span>
                  </div>
                  {verificationError && <div className="patients-feedback error" role="alert">{verificationError}</div>}
                  {verificationNotice && <div className="patients-feedback success" role="status">{verificationNotice}</div>}
                  <button type="submit" className="patients-submit" disabled={isVerifying || isResending || !validPatientOtp(otp)} aria-busy={isVerifying}>
                    {isVerifying ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                    <span>{isVerifying ? 'Verifying…' : 'Verify email'}</span>
                  </button>
                </form>
                <div className="patients-verification-actions">
                  <button type="button" className="patients-secondary-action" disabled={isVerifying || isResending} onClick={resendCode}>
                    {isResending ? 'Sending…' : 'Resend code'}
                  </button>
                  <button type="button" className="patients-secondary-action" disabled={isVerifying || isResending} onClick={finishLater}>
                    Finish later
                  </button>
                </div>
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
                    max={new Date().toISOString().slice(0, 10)}
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
