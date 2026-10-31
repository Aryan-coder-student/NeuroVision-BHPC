import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AlertTriangle, FolderOpen, Loader2 } from 'lucide-react';

import { fetchImagingStudies } from '../services/api';
import { formatIndiaDateTime } from '../utils/date-time';
import { MRI_MODALITIES, formatFileSize } from './segmentation-files';

export default function ImagingStudies() {
  const { patient, workspaceId } = useOutletContext();
  return <PatientImagingStudies key={`${workspaceId}:${patient.id}`} patient={patient} workspaceId={workspaceId} />;
}

function PatientImagingStudies({ patient, workspaceId }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const requestKey = `${workspaceId}:${patient.id}:${page}`;

  useEffect(() => {
    let active = true;
    fetchImagingStudies(workspaceId, patient.id, page)
      .then(data => {
        if (active) setResult({ key: requestKey, data, error: '' });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, data: null, error: 'Could not load imaging study records.' });
      });
    return () => { active = false; };
  }, [workspaceId, patient.id, page, requestKey]);

  const loading = result.key !== requestKey;
  const response = loading ? null : result.data;
  const error = loading ? '' : result.error;
  const studies = response?.results || [];

  return (
    <section aria-labelledby="imaging-title">
      <h1 id="imaging-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Imaging Studies</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
        Basic MRI upload validation records for {patient.patient_code} · {patient.display_name}.
        Original files are never retained; this is not a library of stored scans.
      </p>
      <Link to={`/patients/${patient.id}/segmentation`}
        style={{ display: 'inline-block', margin: '18px 0', color: 'var(--accent-primary)' }}>
        Select BraTS folder or open sample MRI
      </Link>
      {loading && <p role="status"><Loader2 size={16} className="spin" /> Loading studies…</p>}
      {error && <p role="alert" style={{ color: 'var(--error)' }}><AlertTriangle size={15} /> {error}</p>}
      {!loading && !error && !studies.length && (
        <div style={{ padding: 28, border: '1px solid var(--outline-dim)', background: 'var(--bg-card)', textAlign: 'center' }}>
          <FolderOpen size={25} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p>No imaging studies recorded for this patient.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>The built-in BraTS demo is not saved as a patient study.</p>
        </div>
      )}
      {!loading && !error && studies.map(study => (
        <article key={study.id} style={{ border: '1px solid var(--outline-dim)', background: 'var(--bg-card)', padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <strong style={{ color: 'var(--text-bright)' }}>MRI upload validation</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatIndiaDateTime(study.created_at)}</span>
          </div>
          <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Files not retained — preview or rerun requires selecting local files again.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {MRI_MODALITIES.map(({ id, label }) => (
              <span key={id} style={{ fontSize: 12, color: 'var(--text-bright)' }}>
                {label}: {formatFileSize(study.modality_sizes_bytes[id])}
              </span>
            ))}
          </div>
        </article>
      ))}
      {!loading && !error && response && (response.previous || response.next) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" disabled={!response.previous} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
          <span>Page {page}</span>
          <button type="button" disabled={!response.next} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
