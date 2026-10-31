import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { FileText, ShieldCheck } from 'lucide-react';

const PANEL = {
  marginTop: 20, border: '1px solid var(--outline-dim)',
  background: 'var(--bg-card)', padding: 24,
};
const ROW = {
  display: 'flex', gap: 18, justifyContent: 'space-between',
  borderBottom: '1px solid var(--outline-dim)', padding: '10px 0',
  fontSize: 13,
};

export default function Reports() {
  const { patient } = useOutletContext();
  const { state } = useLocation();
  const incoming = state?.segmentationReport;
  const report = incoming?.source === 'ai-inference' &&
    incoming?.patient_id === patient.id ? incoming : null;
  const volumes = report?.measurements && typeof report.measurements === 'object' &&
    !Array.isArray(report.measurements)
    ? Object.entries(report.measurements).filter(([, value]) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0
    )
    : [];

  return (
    <section aria-labelledby="reports-title">
      <h1 id="reports-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>
        Research reports
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        Reports for {patient.patient_code} · {patient.display_name} only.
      </p>
      {report ? (
        <div style={PANEL}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ color: 'var(--text-bright)', fontSize: 17 }}>
              AI segmentation summary
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>
            Temporary browser-only research preview of the actual inference response.
            Not a saved medical report, pathology diagnosis, or clinical interpretation.
            The predicted mask stays in the 3D renderer and is not attached or downloadable here.
          </p>
          <dl style={{ margin: '18px 0' }}>
            <div style={ROW}><dt>Patient ID</dt><dd>{patient.patient_code}</dd></div>
            <div style={ROW}><dt>Input MRI modalities</dt><dd>{report.modality_count} / 4</dd></div>
            <div style={ROW}><dt>Model</dt><dd>{report.model?.name || 'Not available'}</dd></div>
            <div style={ROW}><dt>Model version</dt><dd>{report.model?.version || 'Not available'}</dd></div>
            <div style={ROW}><dt>Result source</dt><dd>AI model response (research only)</dd></div>
            {volumes.map(([region, value]) => (
              <div style={ROW} key={region}>
                <dt>{region.replaceAll('_', ' ')}</dt>
                <dd>{value} cm³</dd>
              </div>
            ))}
          </dl>
          {!volumes.length && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              The model did not return validated region-volume measurements.
            </p>
          )}
          <p style={{ display: 'flex', gap: 7, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
            <ShieldCheck size={15} /> No generated mask file is offered for download.
            This preview is not saved to patient history or report storage.
          </p>
          <Link to={`/patients/${patient.id}/segmentation`} style={{
            display: 'inline-block', color: 'var(--accent-primary)',
            textDecoration: 'underline', marginTop: 18, fontSize: 13,
          }}>
            Return to segmentation
          </Link>
        </div>
      ) : (
        <div style={{ ...PANEL, minHeight: 220, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <FileText size={24} style={{ color: 'var(--text-label)', marginBottom: 10 }} />
            <h2 style={{ color: 'var(--text-bright)', fontSize: 15 }}>No saved reports</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 14px' }}>
              Report storage is not connected yet. After a real segmentation run,
              you can view a temporary research summary here without downloading a mask.
            </p>
            <Link to={`/patients/${patient.id}/segmentation`} style={{
              color: 'var(--accent-primary)', textDecoration: 'underline',
            }}>
              Open segmentation workspace
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
