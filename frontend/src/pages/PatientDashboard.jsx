import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageSquare, Pencil, ScanLine, ShieldCheck } from 'lucide-react';
import PatientEmailVerification from '../components/PatientEmailVerification';
import { useAuth } from '../context/auth-context';
import { fetchPatientGrant, updatePatientDetails } from '../services/api';
import { localDateInputValue, validatePatientDetails } from './patient-form';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { patient, refreshPatient } = useOutletContext();
  const { org } = useAuth();
  const [grant, setGrant] = useState(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', date_of_birth: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = org.role === 'ADMIN';

  useEffect(() => {
    const controller = new AbortController();
    fetchPatientGrant(org.id, patient.id, { signal: controller.signal })
      .then(setGrant)
      .catch(error => { if (error.code !== 'ERR_CANCELED') setError('Identity status could not be loaded.'); });
    return () => controller.abort();
  }, [org.id, patient.id]);

  const startEditing = () => {
    setEditForm({
      display_name: patient.display_name,
      date_of_birth: patient.date_of_birth || '',
    });
    setEditErrors({});
    setEditError('');
    setEditSuccess('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (isSaving) return;
    setIsEditing(false);
    setEditError('');
    setEditErrors({});
  };

  const saveDetails = async (event) => {
    event.preventDefault();
    if (!isAdmin || isSaving) return;
    const { values, errors } = validatePatientDetails(editForm);
    setEditErrors(errors);
    setEditError('');
    if (Object.keys(errors).length) return;

    setIsSaving(true);
    try {
      await updatePatientDetails(org.id, patient.id, values);
    } catch (requestError) {
      const data = requestError.response?.data;
      const serverErrors = {
        display_name: Array.isArray(data?.display_name) ? data.display_name[0] : data?.display_name,
        date_of_birth: Array.isArray(data?.date_of_birth) ? data.date_of_birth[0] : data?.date_of_birth,
      };
      if (Object.values(serverErrors).some(Boolean)) {
        setEditErrors(serverErrors);
      } else {
        setEditError(data?.detail || 'Could not save patient details. Try again.');
      }
      setIsSaving(false);
      return;
    }

    // A successful PATCH must not be presented as a failed save if the
    // subsequent read fails (for example due to a transient network error).
    setIsEditing(false);
    setEditSuccess('Patient details updated.');
    try {
      await refreshPatient();
    } catch {
      setEditSuccess('Changes saved, but the updated record could not be loaded. Refresh this page to see them.');
    } finally {
      setIsSaving(false);
    }
  };

  const verified = grant?.status === 'ACTIVE' || patient.global_identity_id;
  const base = `/patients/${patient.id}`;
  return (
    <div className="patient-dashboard">
      <div className="patient-dashboard-grid">
        <section className="patient-card patient-summary-card">
          <div className="patient-card-label">Patient overview</div>
          <div className="patient-summary-header">
            <h1>{patient.display_name}</h1>
            {isAdmin && !isEditing && (
              <button type="button" className="patient-edit-trigger" onClick={startEditing}>
                <Pencil size={14} aria-hidden="true" /> Edit details
              </button>
            )}
          </div>
          <code>{patient.patient_code}</code>
          {editSuccess && !isEditing && <p className="patient-edit-success" role="status">{editSuccess}</p>}
          {isEditing ? (
            <form className="patient-edit-form" onSubmit={saveDetails} noValidate>
              <div className="patient-edit-field">
                <label htmlFor="patient-edit-name">Patient name</label>
                <input
                  id="patient-edit-name"
                  type="text"
                  value={editForm.display_name}
                  maxLength={160}
                  autoComplete="off"
                  onChange={event => {
                    setEditForm(current => ({ ...current, display_name: event.target.value }));
                    setEditErrors(current => ({ ...current, display_name: '' }));
                  }}
                  aria-invalid={Boolean(editErrors.display_name)}
                  aria-describedby={editErrors.display_name ? 'patient-edit-name-error' : undefined}
                  disabled={isSaving}
                />
                {editErrors.display_name && <span id="patient-edit-name-error" className="patient-edit-error" role="alert">{editErrors.display_name}</span>}
              </div>
              <div className="patient-edit-field">
                <label htmlFor="patient-edit-dob">Date of birth</label>
                <input
                  id="patient-edit-dob"
                  type="date"
                  max={localDateInputValue()}
                  value={editForm.date_of_birth}
                  onChange={event => {
                    setEditForm(current => ({ ...current, date_of_birth: event.target.value }));
                    setEditErrors(current => ({ ...current, date_of_birth: '' }));
                  }}
                  aria-invalid={Boolean(editErrors.date_of_birth)}
                  aria-describedby={editErrors.date_of_birth ? 'patient-edit-dob-error' : undefined}
                  disabled={isSaving}
                />
                {editErrors.date_of_birth && <span id="patient-edit-dob-error" className="patient-edit-error" role="alert">{editErrors.date_of_birth}</span>}
              </div>
              <p className="patient-edit-note">The patient ID cannot be changed. Age is recalculated automatically.</p>
              {editError && <p className="patient-edit-error" role="alert">{editError}</p>}
              <div className="patient-edit-actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={cancelEditing} disabled={isSaving}>Cancel</button>
              </div>
            </form>
          ) : (
            <dl className="patient-demographics">
            <div><dt>Age</dt><dd>{patient.age == null ? 'Not recorded' : patient.age + ' years'}</dd></div>
              <div><dt>Date of birth</dt><dd>{patient.date_of_birth || 'Not recorded'}</dd></div>
            </dl>
          )}
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
