import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, MessageSquare, ScanLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { fetchPatientGrant, requestPatientGrant, verifyPatientGrant } from '../services/api';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { patient, refreshPatient } = useOutletContext();
  const { org } = useAuth();
  const [grant, setGrant] = useState(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const isAdmin = org.role === 'ADMIN';

  useEffect(() => {
    const controller = new AbortController();
    fetchPatientGrant(org.id, patient.id, { signal: controller.signal })
      .then(setGrant)
      .catch(error => { if (error.code !== 'ERR_CANCELED') setError('Identity status could not be loaded.'); });
    return () => controller.abort();
  }, [org.id, patient.id]);

  const requestCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); emailRef.current?.focus(); return; }
    setBusy(true); setError('');
    try {
      const data = await requestPatientGrant(org.id, patient.id, email);
      setChallenge(data);
      setOtp('');
      window.setTimeout(() => otpRef.current?.focus(), 0);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Verification code could not be sent. Try again.');
    } finally { setBusy(false); }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(otp)) { setError('Enter the 6-digit verification code.'); otpRef.current?.focus(); return; }
    setBusy(true); setError('');
    try {
      const data = await verifyPatientGrant(org.id, patient.id, challenge.challenge_id, otp);
      setGrant(data); setChallenge(null); setEmail(''); setOtp('');
      refreshPatient();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The verification code could not be confirmed.');
      otpRef.current?.focus();
    } finally { setBusy(false); }
  };

  const verified = grant?.status === 'ACTIVE' || patient.global_identity_id;
  const base = `/patients/${patient.id}`;
  return (
    <div className="patient-dashboard">
      <div className="patient-dashboard-grid">
        <section className="patient-card patient-summary-card">
          <div className="patient-card-label">Patient overview</div>
          <h1>{patient.display_name}</h1>
          <code>{patient.patient_code}</code>
          <dl className="patient-demographics">
            <div><dt>Age</dt><dd>{patient.age == null ? 'Not recorded' : patient.age + ' years'}</dd></div>
            <div><dt>Date of birth</dt><dd>{patient.date_of_birth || 'Not recorded'}</dd></div>
          </dl>
          <p>All tools opened here are locked to this patient and the currently selected organization.</p>
          <div className="patient-actions">
            <Link to={`${base}/segmentation`}><ScanLine size={14} /> Run segmentation</Link>
            <Link to={`${base}/vqa`}><MessageSquare size={14} /> Open VQA</Link>
          </div>
        </section>

        <section className="patient-card identity-card" aria-labelledby="identity-title">
          <div className="patient-card-label">Identity grant</div>
          <h2 id="identity-title">Verify patient contact</h2>
          <p className="identity-explainer">Email OTP confirms control of this contact and links the patient identity to this organization. It does not reveal or share records from another clinic.</p>
          {verified ? (
            <div className="identity-success" role="status"><CheckCircle2 size={17} /> Email contact verified</div>
          ) : !isAdmin ? (
            <div className="identity-readonly"><ShieldCheck size={16} /> An organization administrator can start verification.</div>
          ) : challenge ? (
            <form onSubmit={verifyCode} noValidate>
              <label htmlFor="patient-grant-otp">Verification code</label>
              <input ref={otpRef} id="patient-grant-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => { setOtp(event.target.value.replace(/\D/g, '')); setError(''); }} aria-invalid={Boolean(error)} aria-describedby="identity-help identity-error" />
              <span id="identity-help" className="identity-help">Sent to {challenge.masked_email}; expires in 10 minutes.</span>
              {error && <span id="identity-error" className="identity-error" role="alert">{error}</span>}
              <button disabled={busy}>{busy ? <Loader2 className="spin" size={14} /> : <ShieldCheck size={14} />} Verify and link</button>
            </form>
          ) : (
            <form onSubmit={requestCode} noValidate>
              <label htmlFor="patient-grant-email">Patient email</label>
              <input ref={emailRef} id="patient-grant-email" type="email" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} placeholder="patient@example.com" aria-invalid={Boolean(error)} aria-describedby="identity-help identity-error" />
              <span id="identity-help" className="identity-help">Used for verification and future report delivery after separate consent.</span>
              {error && <span id="identity-error" className="identity-error" role="alert">{error}</span>}
              <button disabled={busy}>{busy ? <Loader2 className="spin" size={14} /> : <Mail size={14} />} Send verification code</button>
            </form>
          )}
          <div className="identity-future">Phone OTP and Aadhaar/ABHA verification are not configured yet.</div>
        </section>
      </div>
    </div>
  );
}
