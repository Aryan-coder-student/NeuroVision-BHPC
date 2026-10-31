import { useOutletContext } from 'react-router-dom';
import SavedReportList from './SavedReportList';

export default function History() {
  const { patient, workspaceId } = useOutletContext();
  return (
    <section aria-labelledby="history-title">
      <h1 id="history-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Inference history</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
        Saved segmentation reports for {patient.patient_code} · {patient.display_name}.
        Original MRI volumes and interactive masks are not retained.
      </p>
      <SavedReportList key={`${workspaceId}:${patient.id}`} workspaceId={workspaceId} patient={patient} history />
    </section>
  );
}
