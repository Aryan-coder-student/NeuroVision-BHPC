import { useId, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { requestPatientGrant, verifyPatientGrant } from '../services/api';
import { validPatientOtp } from '../pages/patient-form';
import './PatientEmailVerification.css';

export default function PatientEmailVerification({
  workspaceId,
  patientId,
  initialChallenge = null,
  initialEmail = '',
  onVerified,
  onFinishLater,
}) {
  const id = useId();
  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState(initialChallenge);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState('');
  const busy = Boolean(operation);

  const sendCode = async (event) => {
    event?.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    setOperation('send');
    setError('');
    setNotice('');
    try {
      const nextChallenge = await requestPatientGrant(workspaceId, patientId, email);
      setChallenge(nextChallenge);
      setOtp('');
      setNotice(challenge ? 'A new code was sent. Please check the patient’s email.' : 'Verification code sent.');
      window.setTimeout(() => otpRef.current?.focus(), 0);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Verification code could not be sent. Try again.');
    } finally {
      setOperation('');
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!validPatientOtp(otp)) {
      setError('Enter the six-digit verification code.');
      otpRef.current?.focus();
      return;
    }
    setOperation('verify');
    setError('');
    setNotice('');
    try {
      const grant = await verifyPatientGrant(workspaceId, patientId, challenge.challenge_id, otp);
      onVerified?.(grant);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'The code could not be verified. Check it and try again.');
      otpRef.current?.focus();
    } finally {
      setOperation('');
    }
  };

  if (!challenge) {
    return (
      <form className="patient-verification-form" onSubmit={sendCode} noValidate>
        <label htmlFor={`${id}-email`}>Patient email</label>
        <input
          ref={emailRef}
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={event => { setEmail(event.target.value); setError(''); }}
          placeholder="patient@example.com"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-email-help${error ? ` ${id}-error` : ''}`}
          disabled={busy}
        />
        <span id={`${id}-email-help`} className="patient-verification-help">Used only to verify the patient contact.</span>
        {error && <span id={`${id}-error`} className="patient-verification-error" role="alert">{error}</span>}
        <button type="submit" className="patient-verification-primary" disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 className="spin" size={14} /> : <Mail size={14} />}
          <span>{busy ? 'Sending…' : 'Send verification code'}</span>
        </button>
      </form>
    );
  }

  return (
    <div className="patient-verification-step">
      <form className="patient-verification-form" onSubmit={verifyCode} noValidate>
        <label htmlFor={`${id}-otp`}>6-digit verification code</label>
        <input
          ref={otpRef}
          id={`${id}-otp`}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={event => { setOtp(event.target.value.replace(/\D/g, '')); setError(''); }}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-otp-help${error ? ` ${id}-error` : ''}`}
          disabled={busy}
        />
        <span id={`${id}-otp-help`} className="patient-verification-help">Sent to {challenge.masked_email}; expires in 10 minutes.</span>
        {error && <span id={`${id}-error`} className="patient-verification-error" role="alert">{error}</span>}
        {notice && <span className="patient-verification-notice" role="status">{notice}</span>}
        <button type="submit" className="patient-verification-primary" disabled={busy || !validPatientOtp(otp)} aria-busy={operation === 'verify'}>
          {operation === 'verify' ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
          <span>{operation === 'verify' ? 'Verifying…' : 'Verify email'}</span>
        </button>
      </form>
      <div className="patient-verification-actions">
        <button type="button" disabled={busy} onClick={sendCode}>{operation === 'send' ? 'Sending…' : 'Resend code'}</button>
        {onFinishLater && <button type="button" disabled={busy} onClick={onFinishLater}>Finish later</button>}
      </div>
    </div>
  );
}
