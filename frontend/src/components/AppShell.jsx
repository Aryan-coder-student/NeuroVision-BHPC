import { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
  Brain, LayoutDashboard,
  LogOut, ChevronRight, Database, MessageSquarePlus, Server, Users, Menu, X
} from 'lucide-react';
import './AppShell.css';
import config from '../config';

export default function AppShell() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [menuOpen]);

  const initials = user?.name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?';

  const handleSwitchOrg = () => {
    if (!config.isMainDomain) {
      window.location.href = `${config.MAIN_URL}/select-org`;
    } else {
      navigate('/select-org');
    }
  };

  return (
    <div className="app-shell">
      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      {/* ── Sidebar ── */}
      <aside id="app-navigation" aria-label="Workspace navigation" className={menuOpen ? "sidebar is-open" : "sidebar"}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Brain size={18} /></div>
          <div>
            <div className="sidebar-logo-text">NeuroVision</div>
            <div className="sidebar-logo-sub">Clinical research</div>
          </div>
          <button type="button" className="sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>

        {org && (
          <button type="button" className="sidebar-org" onClick={handleSwitchOrg}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span className="sidebar-org-label">Organization</span>
              <ChevronRight size={12} className="switch-icon" style={{ opacity: 0.5 }} />
            </span>
            <span className="sidebar-org-name">{org.name}</span>
            <span style={{ display: 'block', fontSize: 10, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Switch Workspace
            </span>
          </button>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>
          <NavLink to="/dashboard"     onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={15} /> Dashboard
          </NavLink>
          <NavLink to="/patients"      onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={15} /> Patients
          </NavLink>
          <div className="nav-section-label" style={{ marginTop: 8 }}>Platform</div>
          <NavLink to="/contribute"    onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Database size={15} /> Data Contribution
          </NavLink>
          <NavLink to="/feedback"      onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageSquarePlus size={15} /> Model Feedback
          </NavLink>
          <NavLink to="/models"        onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Server size={15} /> Model Registry
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Workspace owner</div>
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
          <button type="button" className="mobile-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open navigation" aria-controls="app-navigation" aria-expanded={menuOpen}><Menu size={21} /></button>
          <span className="topbar-title">{org?.name ?? 'NeuroVision'}</span>
          <div className="topbar-right">
            <div className="topbar-status">
              <span className="status-dot active" />
              Research workspace
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
