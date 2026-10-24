import { Link, useOutletContext } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
export default function History() {
  const { patient } = useOutletContext();
  return <section aria-labelledby="history-title"><h1 id="history-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Scan history</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Segmentation runs for {patient.patient_code} · {patient.display_name} only.</p><div style={{ marginTop: 20, minHeight: 220, border: '1px solid var(--outline-dim)', background: 'var(--bg-card)', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div><ScanLine size={24} style={{ color: 'var(--text-label)', marginBottom: 10 }} /><h2 style={{ color: 'var(--text-bright)', fontSize: 15 }}>No saved scans</h2><p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 14px' }}>The scan persistence API is not connected yet. Demo results are not stored as clinical history.</p><Link to={`/patients/${patient.id}/segmentation`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Open segmentation workspace</Link></div></div></section>;
}
