import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { fetchPatients } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { org } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchPatients(org.id, { signal: controller.signal }).then(setPatients)
      .catch(requestError => { if (requestError.code !== 'ERR_CANCELED') setError('Workspace summary could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [org.id]);
  return <section aria-labelledby="workspace-dashboard-title">
    <div style={{ marginBottom: 24 }}><h1 id="workspace-dashboard-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Workspace dashboard</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{org.name} · Select a patient before using clinical intelligence tools.</p></div>
    <div className="dash-grid"><div className="dash-kpi"><div className="dash-kpi-label"><Users size={12} /> Registered patients</div><div className="dash-kpi-value">{loading ? '—' : patients.length}</div><div className="dash-kpi-sub">In this organization only</div></div><div className="dash-kpi"><div className="dash-kpi-label"><ShieldCheck size={12} /> Data boundary</div><div className="dash-kpi-value" style={{ fontSize: 20 }}>Tenant isolated</div><div className="dash-kpi-sub">Records are not shared automatically</div></div></div>
    <div className="dash-panel" style={{ marginTop: 16 }}><div className="dash-panel-title">Patient workspaces</div>
      {loading && <div style={{ padding: 24, color: 'var(--text-muted)' }} role="status"><Loader2 className="spin" size={16} /> Loading patients…</div>}
      {error && <div style={{ padding: 24, color: 'var(--error)' }} role="alert">{error}</div>}
      {!loading && !error && patients.length === 0 && <div style={{ padding: 24, color: 'var(--text-muted)' }}>No patients are registered. <Link to="/patients" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Open patient registry</Link>.</div>}
      {!loading && !error && patients.length > 0 && <div className="dash-table-scroll" role="region" aria-label="Patient workspaces" tabIndex={0}><table className="patient-table"><thead><tr><th>Patient ID</th><th>Display name</th><th>Identity</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{patients.slice(0, 8).map(patient => <tr key={patient.id}><td><code>{patient.patient_code}</code></td><td className="patient-name">{patient.display_name}</td><td>{patient.global_identity_id ? 'Contact verified' : 'Not linked'}</td><td><Link to={`/patients/${patient.id}/dashboard`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-primary)' }}>Open <ArrowRight size={12} /></Link></td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
