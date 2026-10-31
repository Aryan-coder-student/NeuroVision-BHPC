import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';

import { fetchSegmentationReports } from '../services/api';
import { formatIndiaDateTime } from '../utils/date-time';

const PANEL = {
  border: '1px solid var(--outline-dim)',
  background: 'var(--bg-card)', padding: 20, marginTop: 12,
};

export default function SavedReportList({ workspaceId, patient, history = false }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const requestKey = `${workspaceId}:${patient.id}:${page}`;

  useEffect(() => {
    let active = true;
    fetchSegmentationReports(workspaceId, patient.id, page)
      .then(data => { if (active) setResult({ key: requestKey, data, error: '' }); })
      .catch(() => { if (active) setResult({ key: requestKey, data: null, error: 'Unable to load saved reports.' }); });
    return () => { active = false; };
  }, [workspaceId, patient.id, page, requestKey]);

  const loading = result.key !== requestKey;
  const response = loading ? null : result.data;
  const error = loading ? '' : result.error;
  const reports = response?.results || [];
  return (
    <section aria-label={history ? 'Saved inference history' : 'Saved segmentation reports'}>
      {loading && <p role="status"><Loader2 size={15} className="spin" /> Loading saved reports…</p>}
      {error && <p role="alert" style={{ color: 'var(--warning)' }}>{error}</p>}
      {!loading && !error && !reports.length && (
        <div style={{ ...PANEL, padding: 30, textAlign: 'center' }}>
          <FileText size={22} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
          <strong style={{ color: 'var(--text-bright)' }}>No saved inference reports</strong>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            The BraTS reference demo is not saved to patient history. Real reports will appear after successful model inference and snapshot capture.
          </p>
          <Link to={`/patients/${patient.id}/segmentation`} style={{ color: 'var(--accent-primary)' }}>
            Open 3D segmentation
          </Link>
        </div>
      )}
      {!loading && !error && reports.map(report => (
        <article key={report.id} style={PANEL}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text-bright)' }}>{report.model_name}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatIndiaDateTime(report.created_at)}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0' }}>
            Model version {report.model_version} · AI inference report · Static 3D snapshot saved
          </p>
          <Link to={`/patients/${patient.id}/reports?report_id=${report.id}`} style={{ color: 'var(--accent-primary)', fontSize: 13 }}>
            Open saved report and image
          </Link>
        </article>
      ))}
      {!loading && !error && response && (response.previous || response.next) && (
        <nav aria-label="Report history pages" style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button type="button" disabled={!response.previous} onClick={() => setPage(n => Math.max(1, n - 1))}>Previous</button>
          <span>Page {page}</span>
          <button type="button" disabled={!response.next} onClick={() => setPage(n => n + 1)}>Next</button>
        </nav>
      )}
    </section>
  );
}
