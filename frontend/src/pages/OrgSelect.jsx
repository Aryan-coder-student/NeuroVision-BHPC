import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Users, LogOut, ChevronRight } from 'lucide-react';
import './OrgSelect.css';

export default function OrgSelect() {
  const { user, selectOrg, logout, getUserOrgs } = useAuth();
  const navigate = useNavigate();
  const orgs = getUserOrgs();

  const handleSelect = (orgId) => {
    selectOrg(orgId);
    navigate('/dashboard');
  };

  return (
    <div className="org-select-page">
      <div className="org-select-header">
        <div className="org-select-greeting">Welcome back</div>
        <div className="org-select-name">{user?.name}</div>
        <div className="org-select-sub">
          <span className="label-uppercase">{user?.role}</span>
          &nbsp;·&nbsp;Select your working organization
        </div>
      </div>

      <div className="org-select-grid">
        {orgs.map(org => (
          <div key={org.id} className="org-card" onClick={() => handleSelect(org.id)}>
            <div className="org-card-badge">{org.tier}</div>
            <div className="org-card-name">{org.name}</div>
            <div className="org-card-location">
              <MapPin size={11} style={{ marginRight: 4 }} />
              {org.location}
            </div>
            <div className="org-card-stats">
              <div>
                <div className="org-card-stat-val">{org.patients.toLocaleString()}</div>
                <div className="org-card-stat-label">Patients</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--accent-primary)' }}>
                <span style={{ fontSize: 12, marginRight: 4 }}>Enter Workspace</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="org-select-logout" onClick={() => { logout(); navigate('/login'); }}>
        <LogOut size={13} style={{ marginRight: 6 }} />
        Sign out
      </button>
    </div>
  );
}
