import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeCsrf } from './services/api';
import { useEffect } from 'react';
import './index.css';
import config from './config';

/* Pages */
import Landing     from './pages/Landing';
import Login       from './pages/Login';
import OrgSelect   from './pages/OrgSelect';
import Dashboard   from './pages/Dashboard';
import Segmentation from './pages/Segmentation';
import VQA         from './pages/VQA';
import History     from './pages/History';
import Reports     from './pages/Reports';
import DataContribution from './pages/DataContribution';
import ModelFeedback    from './pages/ModelFeedback';
import ModelRegistry    from './pages/ModelRegistry';
import Register         from './pages/Register';
import VerifyOTP        from './pages/VerifyOTP';
import AppShell    from './components/AppShell';

/* Global spin keyframe */
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
  .field-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px; }
  .field-input { width: 100%; background: var(--bg-card); border: 1px solid var(--outline-dim);
    color: var(--text-bright); padding: 10px 14px; font-size: 14px; outline: none; transition: border-color 0.15s; }
  .field-input:focus { border-color: var(--accent-primary); }
`;
document.head.appendChild(style);

/* Route guard: must be logged in */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    if (!config.isMainDomain) {
      window.location.href = `${config.MAIN_URL}/login?redirect=${encodeURIComponent(window.location.href)}`;
      return null;
    }
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

/* Route guard: must have selected org */
function RequireOrg({ children }) {
  const { user, org, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  if (!org) {
    if (!config.isMainDomain) {
      // If we are on a subdomain but don't have an org (e.g. invalid subdomain),
      // force redirect back to the central hub for organization selection.
      window.location.href = `${config.MAIN_URL}/select-org`;
      return null;
    }
    return <Navigate to="/select-org" replace />;
  }
  
  return children;
}

function CentralOnly({ children }) {
  if (!config.isMainDomain) {
    window.location.href = `${config.MAIN_URL}${window.location.pathname}${window.location.search}`;
    return null;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"           element={<Landing />} />
      <Route path="/login"      element={<CentralOnly><Login /></CentralOnly>} />
      <Route path="/register"   element={<CentralOnly><Register /></CentralOnly>} />
      <Route path="/verify-otp" element={<CentralOnly><VerifyOTP /></CentralOnly>} />
      <Route path="/select-org" element={<RequireAuth><CentralOnly><OrgSelect /></CentralOnly></RequireAuth>} />

      {/* Protected app shell */}
      <Route element={<RequireOrg><AppShell /></RequireOrg>}>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/segmentation" element={<Segmentation />} />
        <Route path="/vqa"          element={<VQA />} />
        <Route path="/history"      element={<History />} />
        <Route path="/reports"      element={<Reports />} />
        <Route path="/contribute"   element={<DataContribution />} />
        <Route path="/feedback"     element={<ModelFeedback />} />
        <Route path="/models"       element={<ModelRegistry />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    initializeCsrf();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
