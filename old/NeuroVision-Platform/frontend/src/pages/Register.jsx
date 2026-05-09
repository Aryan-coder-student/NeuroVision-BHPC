import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, User, Mail, Lock, ArrowRight, Loader, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { registerUser } from '../services/api';
import './Login.css'; // Reusing base layout styles

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(formData);
      setSuccess(true);
      // Redirect to OTP verification after a short delay
      setTimeout(() => {
        navigate('/verify-otp', { state: { email: formData.email } });
      }, 2000);
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Left Brand Panel ── */}
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
              Join the future of<br />
              <span>Medical Imaging.</span>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Create your professional account to access AI-powered diagnostics, 
              collaborative research tools, and secure clinical workspaces.
            </p>
          </div>
        </div>

        <div className="brand-stats" style={{ marginBottom: 24 }}>
          <div className="brand-stat">
            <div className="brand-stat-val">Secure</div>
            <div className="brand-stat-label">End-to-end encrypted</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-val">Global</div>
            <div className="brand-stat-label">Multi-institution support</div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-panel" style={{ overflowY: 'auto' }}>
        <div className="login-form-box" style={{ padding: '40px 0' }}>
          <div className="login-form-header">
            <div className="login-form-title">Create Professional Account</div>
            <div className="login-form-subtitle">Register your credentials for verification</div>
          </div>

          {error && <div className="login-error" style={{ maxHeight: '150px', overflowY: 'auto' }}>{error}</div>}
          
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle2 size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
              <h3 style={{ color: 'var(--text-bright)' }}>Account Created!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
                Redirecting you to verify your email...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field-group">
                  <label className="field-label">First Name</label>
                  <input
                    className="field-input"
                    name="first_name"
                    placeholder="John"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Last Name</label>
                  <input
                    className="field-input"
                    name="last_name"
                    placeholder="Doe"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label"><User size={11} style={{ marginRight: 5 }} />Username</label>
                <input
                  className="field-input"
                  name="username"
                  placeholder="johndoe_md"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label"><Mail size={11} style={{ marginRight: 5 }} />Professional Email</label>
                <input
                  className="field-input"
                  name="email"
                  type="email"
                  placeholder="john.doe@hospital.com"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label"><Lock size={11} style={{ marginRight: 5 }} />Password</label>
                <div className="password-input-wrapper">
                  <input
                    className="field-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    className="field-input"
                    name="password_confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? <Loader size={16} className="spin" /> : <><ArrowRight size={16} /> Create Account</>}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
