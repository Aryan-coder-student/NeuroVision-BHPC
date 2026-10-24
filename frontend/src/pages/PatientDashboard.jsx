import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle2, MessageSquare, ScanLine, ShieldCheck } from 'lucide-react';
import PatientEmailVerification from '../components/PatientEmailVerification';
import { useAuth } from '../context/auth-context';
import { fetchPatientGrant } from '../services/api';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { patient, refreshPatient } = useOutletContext();
  const { org } = useAuth();
  const [grant, setGrant] = useState(null);
  const [error, setError] = useState('');
  const isAdmin = org.role === 'ADMIN';

  useEffect(() => {
    const controller = new AbortController();
    fetchPatientGrant(org.id, patient.id, { signal: controller.signal })
      .then(setGrant)
      .catch(error => { if (error.code !== 'ERR_CANCELED') setError('Identity status could not be loaded.'); });
    return () => controller.abort();
  }, [org.id, patient.id]);

  const verified = grant?.status === 'ACTIVE' || patient.global_identity_id;
  const base = `/patients/${patient.id}`;
  return (
    <div className="patient-dashboard">
      <div className="patient-dashboard-grid">
        <section className="patient-card patient-summary-card">
          <div className="patient-card-label">Patient overview</div>
          <h1>{patient.display_name}</h1>
          <code>{patient.patient_code}</code>
          <dl className="patient-demographics">
            <div><dt>Age</dt><dd>{patient.age == null ? 'Not recorded' : patient.age + ' years'}</dd></div>
            <div><dt>Date of birth</dt><dd>{patient.date_of_birth || 'Not recorded'}</dd></div>
          </dl>
          <p>All tools opened here are locked to this patient and the currently selected organization.</p>
          <div className="patient-actions">
            <Link to={`${base}/segmentation`}><ScanLine size={14} /> Run segmentation</Link>
            <Link to={`${base}/vqa`}><MessageSquare size={14} /> Open VQA</Link>
          </div>
        </section>

        <section className="patient-card identity-card" aria-labelledby="identity-title">
          <div className="patient-card-label">Identity grant</div>
          <h2 id="identity-title">Verify patient contact</h2>
          <p className="identity-explainer">Email OTP confirms control of this contact and links the patient identity to this organization. It does not reveal or share records from another clinic.</p>
          {error ? (
            <div className="identity-readonly" role="alert">{error}</div>
          ) : verified ? (
            <div className="identity-success" role="status"><CheckCircle2 size={17} /> Email contact verified</div>
          ) : !isAdmin ? (
            <div className="identity-readonly"><ShieldCheck size={16} /> An organization administrator can start verification.</div>
          ) : (
            <PatientEmailVerification
              workspaceId={org.id}
              patientId={patient.id}
              onVerified={data => { setGrant(data); refreshPatient(); }}
            />
          )}
          <div className="identity-future">Phone OTP and Aadhaar/ABHA verification are not configured yet.</div>
        </section>
      </div>
    </div>
  );
}
