import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScanLine, MessageSquare, Users, Activity, ChevronRight, Zap } from 'lucide-react';
import './Dashboard.css';

const PATIENTS = [
  { id: 'P-0041', name: 'Arun Mehta',      age: 52, scan: 'MRI T1+', status: 'Pending Review', priority: 'critical' },
  { id: 'P-0039', name: 'Leela Krishnan',  age: 67, scan: 'MRI FLAIR', status: 'Segmented',    priority: 'warning' },
  { id: 'P-0037', name: 'Vikram Rao',      age: 44, scan: 'MRI T2',   status: 'Report Ready',  priority: 'info' },
  { id: 'P-0035', name: 'Sunita Pillai',   age: 58, scan: 'MRI T1+',  status: 'Pending Review', priority: 'critical' },
  { id: 'P-0033', name: 'Deepak Joshi',    age: 39, scan: 'CT Angio', status: 'Segmented',     priority: 'info' },
];

const ALERTS = [
  { type: 'critical', text: 'P-0041 Arun Mehta — Critical GBM marker detected. Immediate review required.', time: '3 min ago' },
  { type: 'warning',  text: 'P-0039 Leela Krishnan — Segmentation confidence below 85%. Manual check advised.', time: '18 min ago' },
  { type: 'info',     text: 'AI Model update v2.1 deployed. Segmentation accuracy +2.3%.', time: '1 hr ago' },
  { type: 'warning',  text: 'P-0035 Sunita Pillai — New scan uploaded. Awaiting segmentation run.', time: '2 hrs ago' },
];

const PRIORITY_COLORS = { critical: 'var(--error)', warning: 'var(--warning)', info: 'var(--accent-primary)' };

export default function Dashboard() {
  const { org, user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="dash-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
            Dashboard
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {org?.name} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="action-btn ghost" onClick={() => navigate('/vqa')}>
            <MessageSquare size={13} /> New VQA Query
          </button>
          <button className="action-btn primary" onClick={() => navigate('/segmentation')}>
            <ScanLine size={13} /> Run Segmentation
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="dash-grid">
        <div className="dash-kpi">
          <div className="dash-kpi-label"><Users size={12} /> Active Patients</div>
          <div className="dash-kpi-value">{org?.patients?.toLocaleString()}</div>
          <div className="dash-kpi-sub">In your organization</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-label"><ScanLine size={12} /> Scans Today</div>
          <div className="dash-kpi-value">14</div>
          <div className="dash-kpi-sub">+3 vs yesterday</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-label"><Activity size={12} /> Avg Confidence</div>
          <div className="dash-kpi-value">91.4%</div>
          <div className="dash-kpi-sub">Segmentation model</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-label"><Zap size={12} /> Pending Reviews</div>
          <div className="dash-kpi-value" style={{ color: 'var(--error)' }}>5</div>
          <div className="dash-kpi-sub">Require attention</div>
        </div>
      </div>

      {/* Main row */}
      <div className="dash-row">
        {/* Patient list */}
        <div className="dash-panel">
          <div className="dash-panel-title">Recent Patients</div>
          <div className="patient-table-container">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Scan Type</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {PATIENTS.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/segmentation')}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.id}</td>
                    <td className="patient-name">{p.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.age}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.scan}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        background: `${PRIORITY_COLORS[p.priority]}22`,
                        color: PRIORITY_COLORS[p.priority],
                      }}>{p.status}</span>
                    </td>
                    <td><ChevronRight size={13} style={{ color: 'var(--text-label)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert feed */}
        <div className="dash-panel">
          <div className="dash-panel-title">Clinical Alerts</div>
          {ALERTS.map((a, i) => (
            <div key={i} className="alert-item">
              <div className="alert-dot" style={{ background: PRIORITY_COLORS[a.type] }} />
              <div>
                <div className="alert-text">{a.text}</div>
                <div className="alert-time">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
