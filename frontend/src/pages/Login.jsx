import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Lock, Mail, ArrowRight, Loader } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/select-org');
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
              Precision diagnostics.<br />
              <span>Powered by AI.</span>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Real-time 3D tumor segmentation, visual question answering, and
              AI-powered pathology reports — all in one secure clinical platform.
            </p>
          </div>
        </div>

        <div>
          <div className="brand-stats" style={{ marginBottom: 24 }}>
            <div className="brand-stat">
              <div className="brand-stat-val">94%</div>
              <div className="brand-stat-label">Diagnostic accuracy</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-val">+29%</div>
              <div className="brand-stat-label">Improvement over baseline</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-val">3D</div>
              <div className="brand-stat-label">Tumor visualization</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-val">VQA</div>
              <div className="brand-stat-label">AI chat interface</div>
            </div>
          </div>
          <div className="brand-disclaimer">
            For authorized medical personnel only. All patient data is encrypted
            and scoped to your organization.&nbsp;
            HIPAA compliant.
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="login-form-header">
            <div className="login-form-title">Sign in to NeuroVision</div>
            <div className="login-form-subtitle">Access your organization's clinical workspace</div>
          </div>

          {authError && <div className="login-error">{authError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label"><Mail size={11} style={{ marginRight: 5 }} />Professional Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="dr.name@hospital.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label"><Lock size={11} style={{ marginRight: 5 }} />Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? <Loader size={16} className="spin" /> : <><ArrowRight size={16} /> Sign In Securely</>}
            </button>
          </form>

          <div className="login-demo-note">
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Demo Credentials</p>
            <p>Email: <code>dr.patel@metro.in</code></p>
            <p>Email: <code>admin@neurovision.ai</code></p>
            <p style={{ marginTop: 6 }}>Password: <code>password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
