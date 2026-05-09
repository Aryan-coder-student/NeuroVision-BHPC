import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, LogOut, ChevronRight, Plus, Loader, X, Globe, Mail, Phone } from 'lucide-react';
import './OrgSelect.css';

export default function OrgSelect() {
  const { user, workspaces, selectOrg, logout, createWorkspace } = useAuth();
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    inst_type: 'HOSPITAL',
    contact_email: user?.email || '',
    contact_phone: '',
    address: '',
    country: 'India'
  });

  const handleSelect = (ws) => {
    selectOrg(ws);
    // Note: selectOrg will handle the window.location redirect if domain_url exists
    if (!ws.domain_url) {
      navigate('/dashboard');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newWs = await createWorkspace(formData);
      setShowCreateModal(false);
      // Automatically select the newly created workspace
      handleSelect(newWs);
    } catch (err) {
      alert("Failed to create workspace. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="org-select-page">
      <div className="org-select-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="org-select-greeting">Welcome back</div>
            <div className="org-select-name">{user?.name}</div>
          </div>
        </div>
        <div className="org-select-sub">
          <span className="label-uppercase">{user?.role}</span>
          &nbsp;·&nbsp;Select your clinical workspace
        </div>
      </div>

      <div className="org-select-grid">
        {/* --- Real Workspaces --- */}
        {workspaces.map(ws => (
          <div key={ws.id} className="org-card" onClick={() => handleSelect(ws)}>
            <div className="org-card-badge">{ws.inst_type}</div>
            <div className="org-card-name">{ws.name}</div>
            <div className="org-card-location">
              <MapPin size={11} style={{ marginRight: 4 }} />
              {ws.country || 'Global'}
            </div>
            <div className="org-card-stats">
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {ws.domain_url || 'Provisioning...'}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--accent-primary)' }}>
                <span style={{ fontSize: 12, marginRight: 4 }}>Enter</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}

        {/* --- Create New Workspace Card --- */}
        <div className="org-card create-card" onClick={() => setShowCreateModal(true)}>
          <div className="create-card-content">
            <div className="create-icon">
              <Plus size={24} />
            </div>
            <div className="create-label">Create New Workspace</div>
            <div className="create-sub">Set up a new clinical or research environment</div>
          </div>
        </div>
      </div>

      <button className="org-select-logout" onClick={() => { logout(); navigate('/login'); }}>
        <LogOut size={13} style={{ marginRight: 6 }} />
        Sign out
      </button>

      {/* --- Create Workspace Modal --- */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Clinical Workspace</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label"><Building2 size={11} style={{ marginRight: 5 }} />Institution Name</label>
                  <input
                    className="field-input"
                    placeholder="e.g. Apollo Memorial Hospital"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="field-group">
                  <label className="field-label">Institution Type</label>
                  <select 
                    className="field-input"
                    value={formData.inst_type}
                    onChange={e => setFormData({...formData, inst_type: e.target.value})}
                  >
                    <option value="HOSPITAL">General Hospital</option>
                    <option value="CLINIC">Specialized Clinic</option>
                    <option value="RESEARCH">Research Laboratory</option>
                    <option value="UNIVERSITY">University Department</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label"><Mail size={11} style={{ marginRight: 5 }} />Contact Email</label>
                  <input
                    className="field-input"
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label"><Globe size={11} style={{ marginRight: 5 }} />Country</label>
                  <input
                    className="field-input"
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button className="create-submit-btn" type="submit" disabled={creating}>
                {creating ? <Loader size={18} className="spin" /> : "Create & Provision Workspace"}
              </button>
              
              <p className="modal-note">
                Provisioning includes setting up an isolated database schema and a dedicated subdomain.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
