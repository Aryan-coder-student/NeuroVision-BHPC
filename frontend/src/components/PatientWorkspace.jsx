import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, LayoutDashboard, Loader2, MessageSquare, ScanLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { fetchPatient } from '../services/api';
import './PatientWorkspace.css';

export default function PatientWorkspace() {
  const { patientId } = useParams();
  const { org } = useAuth();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');

  const refreshPatient = useCallback(async () => {
    const record = await fetchPatient(org.id, patientId);
    setPatient(record);
  }, [org.id, patientId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPatient(org.id, patientId, { signal: controller.signal })
      .then(setPatient)
      .catch(requestError => {
        if (requestError.code !== 'ERR_CANCELED') setError('This patient is not available in the selected workspace.');
      });
    return () => controller.abort();
  }, [org.id, patientId]);

  useEffect(() => {
    if (!patient) return undefined;
    const previousTitle = document.title;
    document.title = `${patient.patient_code} · NeuroVision`;
    return () => { document.title = previousTitle; };
  }, [patient]);

  if (error) return (
    <div className="patient-workspace-state" role="alert">
      <ShieldCheck size={22} />
      <h1>Patient unavailable</h1>
      <p>{error}</p>
      <Link to="/patients">Return to patient registry</Link>
    </div>
  );

  if (!patient) return <div className="patient-workspace-loading" role="status"><Loader2 className="spin" size={18} /> Loading patient workspace…</div>;

  const base = `/patients/${patient.id}`;
  return (
    <section className="patient-workspace">
      <header className="patient-context">
        <div>
          <Link className="patient-back" to="/patients"><ArrowLeft size={12} /> Patient registry</Link>
          <div className="patient-context-title">
            <code>{patient.patient_code}</code>
            <strong>{patient.display_name}</strong>
            <span>Patient-scoped workspace</span>
          </div>
        </div>
        <div className={`patient-link-status ${patient.global_identity_id ? 'verified' : ''}`}>
          <ShieldCheck size={13} /> {patient.global_identity_id ? 'Contact verified' : 'Identity not linked'}
        </div>
      </header>
      <nav className="patient-tabs" aria-label="Patient workspace">
        <NavLink end to={`${base}/dashboard`}><LayoutDashboard size={14} /> Overview</NavLink>
        <NavLink to={`${base}/segmentation`}><ScanLine size={14} /> 3D Segmentation</NavLink>
        <NavLink to={`${base}/vqa`}><MessageSquare size={14} /> VQA</NavLink>
        <NavLink to={`${base}/history`}><Activity size={14} /> History</NavLink>
        <NavLink to={`${base}/reports`}><Activity size={14} /> Reports</NavLink>
      </nav>
      <Outlet context={{ patient, refreshPatient }} />
    </section>
  );
}
