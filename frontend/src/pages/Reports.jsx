import { useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { fetchSegmentationReport, fetchSegmentationSnapshot } from '../services/api';
import { formatIndiaDateTime } from '../utils/date-time';
import SavedReportList from './SavedReportList';

const PANEL = {
  marginTop: 20, border: '1px solid var(--outline-dim)',
  background: 'var(--bg-card)', padding: 24,
};
const ROW = {
  display: 'flex', gap: 18, justifyContent: 'space-between',
  borderBottom: '1px solid var(--outline-dim)', padding: '10px 0',
  fontSize: 13,
};

function MeasurementRows({ measurements }) {
  const values = measurements && typeof measurements === 'object' && !Array.isArray(measurements)
    ? Object.entries(measurements).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    : [];
  if (!values.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Validated physical region volumes are not available for this result.</p>;
  }
  return (
    <dl>
      {values.map(([name, value]) => (
        <div key={name} style={ROW}><dt>{name.replaceAll('_', ' ')}</dt><dd>{value} cm³</dd></div>
      ))}
    </dl>
  );
}

function SavedReportDetail({ patient, workspaceId, reportId }) {
  const [result, setResult] = useState({ report: null, snapshotUrl: '', error: '', loaded: false });
  useEffect(() => {
    let active = true;
    let url = '';
    Promise.all([
      fetchSegmentationReport(workspaceId, patient.id, reportId),
      fetchSegmentationSnapshot(workspaceId, patient.id, reportId),
    ]).then(([report, png]) => {
      if (!active) return;
      url = URL.createObjectURL(png);
      setResult({ report, snapshotUrl: url, error: '', loaded: true });
    }).catch(() => {
      if (active) setResult({ report: null, snapshotUrl: '', error: 'This report is unavailable in the selected patient workspace.', loaded: true });
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [workspaceId, patient.id, reportId]);

  if (!result.loaded) return <div style={PANEL} role="status">Loading saved research report and image…</div>;
  if (result.error) return <div style={PANEL} role="alert">{result.error}</div>;
  const { report, snapshotUrl } = result;
  return (
    <article style={PANEL} aria-label="Saved segmentation report">
      <h2 style={{ fontSize: 17, color: 'var(--text-bright)' }}>Saved AI segmentation report</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
        Research only · {formatIndiaDateTime(report.created_at)} · Not a clinical diagnosis
      </p>
      <img src={snapshotUrl} alt="Saved 3D segmentation snapshot from the actual inference viewer"
        style={{ display: 'block', maxWidth: '100%', maxHeight: 460, margin: '18px auto', objectFit: 'contain' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        Static PNG of the segmentation view. Original MRI and interactive 3D mask are not stored.
      </p>
      <dl>
        <div style={ROW}><dt>Patient</dt><dd>{patient.patient_code}</dd></div>
        <div style={ROW}><dt>Model</dt><dd>{report.model_name}</dd></div>
        <div style={ROW}><dt>Model version</dt><dd>{report.model_version}</dd></div>
        <div style={ROW}><dt>Imaging study</dt><dd>{report.imaging_study_id ? 'Linked metadata record' : 'Not linked'}</dd></div>
      </dl>
      <h3 style={{ fontSize: 14, marginTop: 20, color: 'var(--text-bright)' }}>Model region measurements</h3>
      <MeasurementRows measurements={report.measurements_cm3} />
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 15 }}>
        <ShieldCheck size={14} /> Saved with server-signed inference provenance. No clinical interpretation is generated.
      </p>
    </article>
  );
}

export default function Reports() {
  const { patient, workspaceId } = useOutletContext();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const reportId = params.get('report_id');
  const sample = state?.sampleReport?.source === 'sample_reference'
    && state.sampleReport.patient_id === patient.id
    && /^data:image\/png;base64,/.test(state.sampleReport.snapshot_data_url || '');
  const incoming = state?.segmentationReport;
  const temporary = !reportId && !sample && incoming?.source === 'ai-inference'
    && incoming?.patient_id === patient.id ? incoming : null;
  return (
    <section aria-labelledby="reports-title">
      <h1 id="reports-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Research reports</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
        Saved inference reports and sample previews for {patient.patient_code} · {patient.display_name}.
      </p>
      {reportId && (
        <SavedReportDetail key={`${workspaceId}:${patient.id}:${reportId}`}
          workspaceId={workspaceId} patient={patient} reportId={reportId} />
      )}
      {!reportId && sample && (
        <article style={PANEL}>
          <h2 style={{ color: 'var(--text-bright)', fontSize: 17 }}>BraTS 2021 reference sample — report preview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Dataset annotation, NOT an AI prediction or a patient-specific medical result.
            This image is captured from the built-in NiiVue 3D viewer.
          </p>
          <img src={state.sampleReport.snapshot_data_url}
            alt="3D BraTS sample MRI and reference annotation snapshot"
            style={{ display: 'block', width: '100%', maxHeight: 460, objectFit: 'contain', margin: '18px auto' }} />
          <dl>
            <div style={ROW}><dt>Dataset</dt><dd>BraTS 2021 reference volume</dd></div>
            <div style={ROW}><dt>Mask</dt><dd>Reference annotation (not AI generated)</dd></div>
            <div style={ROW}><dt>Model measurements</dt><dd>Not available — no inference performed</dd></div>
          </dl>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            This demo report exists only for this browser navigation. It is not stored in PostgreSQL or patient history.
          </p>
        </article>
      )}
      {temporary && (
        <article style={PANEL}>
          <h2 style={{ color: 'var(--text-bright)', fontSize: 16 }}>Temporary inference summary</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Unsaved browser-only metadata. Return to the viewer and choose “Save research report with 3D image” to retain a screenshot.
          </p>
          <div style={ROW}><dt>Model</dt><dd>{temporary.model?.name || 'Unknown'}</dd></div>
          <MeasurementRows measurements={temporary.measurements} />
          <Link to={`/patients/${patient.id}/segmentation`}>Back to segmentation</Link>
        </article>
      )}
      <h2 style={{ fontSize: 16, color: 'var(--text-bright)', marginTop: 26 }}>Saved reports</h2>
      <SavedReportList key={`${workspaceId}:${patient.id}`} workspaceId={workspaceId} patient={patient} />
    </section>
  );
}
