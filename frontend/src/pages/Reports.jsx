import { Link, useOutletContext } from 'react-router-dom';
import { FileText } from 'lucide-react';
export default function Reports() {
  const { patient } = useOutletContext();
  return <section aria-labelledby="reports-title"><h1 id="reports-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Pathology reports</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Reports for {patient.patient_code} · {patient.display_name} only.</p><div style={{ marginTop: 20, minHeight: 220, border: '1px solid var(--outline-dim)', background: 'var(--bg-card)', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div><FileText size={24} style={{ color: 'var(--text-label)', marginBottom: 10 }} /><h2 style={{ color: 'var(--text-bright)', fontSize: 15 }}>No saved reports</h2><p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 14px' }}>Report storage is not connected yet. Downloads generated in segmentation remain local to this browser.</p><Link to={`/patients/${patient.id}/segmentation`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Open segmentation workspace</Link></div></div></section>;
}
