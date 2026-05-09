import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, ShieldCheck, ArrowRight, Loader, Mail } from 'lucide-react';
import { verifyOTP } from '../services/api';
import './Login.css';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!emailFromState) {
      // If no email in state, user might have refreshed. 
      // We could redirect or just let them type it.
    }
  }, [emailFromState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOTP(email, otp);
      // Success! Redirect to login
      navigate('/login', { state: { message: 'Email verified successfully. You can now log in.' } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed. Please check your code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      const { resendOTP } = await import('../services/api');
      await resendOTP(email);
      setResendMessage('A new verification code has been sent.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div>
          <div className="brand-logo">
            <div className="brand-logo-icon"><Brain size={22} /></div>
            <div>
              <div className="brand-logo-text">NeuroVision</div>
              <div className="brand-logo-sub">Clinical AI Platform</div>
            </div>
          </div>
          <div style={{ marginTop: 64 }}>
            <div className="brand-tagline">
              Secure your<br />
              <span>Identity.</span>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              We've sent a 6-digit verification code to your professional email. 
              This ensures your clinical data remains private and secure.
            </p>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="login-form-header">
            <div className="login-form-title">Verify Email Address</div>
            <div className="login-form-subtitle">Enter the code sent to your inbox</div>
          </div>

          {error && <div className="login-error">{error}</div>}
          {resendMessage && <div className="login-success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 20, border: '1px solid rgba(34, 197, 94, 0.2)' }}>{resendMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label"><Mail size={11} style={{ marginRight: 5 }} />Email Address</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="dr.doe@hospital.com"
                required
                disabled={!!emailFromState}
              />
            </div>

            <div className="field-group">
              <label className="field-label"><ShieldCheck size={11} style={{ marginRight: 5 }} />Verification Code</label>
              <input
                className="field-input"
                type="text"
                maxLength="6"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: 24, letterSpacing: '0.5em', textAlign: 'center', fontWeight: 700 }}
                required
              />
            </div>

            <button className="login-btn" type="submit" disabled={loading || otp.length !== 6}>
              {loading ? <Loader size={16} className="spin" /> : <><ArrowRight size={16} /> Verify & Activate</>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Didn't receive a code? <button 
              onClick={handleResend} 
              disabled={resendLoading}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-primary)', 
                fontWeight: 600, 
                cursor: resendLoading ? 'not-allowed' : 'pointer', 
                padding: 0,
                opacity: resendLoading ? 0.5 : 1
              }}
            >
              {resendLoading ? 'Sending...' : 'Resend'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
