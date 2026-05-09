import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Brain, LayoutDashboard, MessageSquare, ScanLine,
  History, LogOut, ChevronRight, Activity, Database, MessageSquarePlus, Server,
  Menu
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";
import './AppShell.css';

const NavContent = ({ onNavClick }) => {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    .split(' ').slice(0, 2).map(n => n[0]).join('') ?? '?';

  return (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Brain size={18} /></div>
        <div>
          <div className="sidebar-logo-text">NeuroVision</div>
          <div className="sidebar-logo-sub">Clinical AI</div>
        </div>
      </div>

      {org && (
        <div className="sidebar-org" onClick={() => { navigate('/select-org'); onNavClick?.(); }}>
          <div className="sidebar-org-label">Organization</div>
          <div className="sidebar-org-name">{org.name}</div>
        </div>
      )}

      <nav className="sidebar-nav">
        <div className="nav-section-label">Workspace</div>
        <NavLink to="/dashboard"     onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={15} /> Dashboard
        </NavLink>
        <NavLink to="/segmentation"  onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <ScanLine size={15} /> 3D Segmentation
        </NavLink>
        <NavLink to="/vqa"           onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={15} /> VQA Diagnostic Chat
        </NavLink>
        <NavLink to="/history"       onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={15} /> Scan History
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: 8 }}>Intelligence</div>
        <NavLink to="/reports"       onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={15} /> Pathology Reports
        </NavLink>
        <NavLink to="/contribute"    onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Database size={15} /> Data Contribution
        </NavLink>
        <NavLink to="/feedback"      onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquarePlus size={15} /> Model Feedback
        </NavLink>
        <NavLink to="/models"        onClick={onNavClick} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
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
        <button className="sidebar-logout-btn" onClick={() => { logout(); navigate('/login'); onNavClick?.(); }}>
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </>
  );
};

export default function AppShell() {
  const { org } = useAuth();

  return (
    <div className="app-shell">
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <NavContent />
      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sheet>
              <SheetTrigger asChild>
                <button className="mobile-menu-btn">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-[240px]">
                <div className="flex flex-col h-full bg-[#09090b]">
                   <NavContent onNavClick={() => {}} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="topbar-title">{org?.name ?? 'NeuroVision'}</span>
          </div>
          
          <div className="topbar-right">
            <div className="topbar-status">
              <span className="status-dot active" />
              <span className="hidden-mobile">AI Models Online</span>
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
