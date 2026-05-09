import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Brain, LayoutDashboard, MessageSquare, ScanLine,
  History, LogOut, ChevronRight, Activity, Database, MessageSquarePlus, Server
} from 'lucide-react';
import './AppShell.css';
import config from '../config';

export default function AppShell() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    .split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?';

  const handleSwitchOrg = () => {
    if (!config.isMainDomain) {
      window.location.href = `${config.MAIN_URL}/select-org`;
    } else {
      navigate('/select-org');
    }
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Brain size={18} /></div>
          <div>
            <div className="sidebar-logo-text">NeuroVision</div>
            <div className="sidebar-logo-sub">Clinical AI</div>
          </div>
        </div>

        {org && (
          <div className="sidebar-org" onClick={handleSwitchOrg}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div className="sidebar-org-label">Organization</div>
              <ChevronRight size={12} className="switch-icon" style={{ opacity: 0.5 }} />
            </div>
            <div className="sidebar-org-name">{org.name}</div>
            <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Switch Workspace
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>
          <NavLink to="/dashboard"     className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={15} /> Dashboard
          </NavLink>
          <NavLink to="/segmentation"  className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <ScanLine size={15} /> 3D Segmentation
          </NavLink>
          <NavLink to="/vqa"           className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageSquare size={15} /> VQA Diagnostic Chat
          </NavLink>
          <NavLink to="/history"       className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={15} /> Scan History
          </NavLink>

          <div className="nav-section-label" style={{ marginTop: 8 }}>Intelligence</div>
          <NavLink to="/reports"       className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Activity size={15} /> Pathology Reports
          </NavLink>
          <NavLink to="/contribute"    className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Database size={15} /> Data Contribution
          </NavLink>
          <NavLink to="/feedback"      className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageSquarePlus size={15} /> Model Feedback
          </NavLink>
          <NavLink to="/models"        className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Server size={15} /> Model Registry
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{org?.name ?? 'NeuroVision'}</span>
          <div className="topbar-right">
            <div className="topbar-status">
              <span className="status-dot active" />
              AI Models Online
            </div>
          </div>
        </header>
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
