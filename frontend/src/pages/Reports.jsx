import { useState } from 'react';
import { FileText, Download, Loader, CheckCircle2 } from 'lucide-react';

const MOCK_REPORTS = [
  { id: 'RPT-0023', patient: 'Arun Mehta',    date: '2026-04-05', finding: 'GBM Grade IV · Right Temporal', status: 'Final' },
  { id: 'RPT-0022', patient: 'Vikram Rao',    date: '2026-04-04', finding: 'Low-Grade Glioma · Frontal',    status: 'Final' },
  { id: 'RPT-0021', patient: 'Deepak Joshi',  date: '2026-04-03', finding: 'No Mass · Normal Perfusion',    status: 'Final' },
];

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(false);

  const generate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1800));
    setGenerating(false);
    setGenerated(true);
  };

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>Pathology Reports</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>AI-generated clinical pathology reports for your organization</div>
        </div>
        <button onClick={generate} disabled={generating} style={{ background: 'var(--accent-primary)', border: 'none', color: 'var(--bg-void)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating ? <><Loader size={14} /> Generating…</> : <><FileText size={14} /> Generate New Report</>}
        </button>
      </div>

      {generated && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid var(--success)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--success)' }}>
          <CheckCircle2 size={15} /> New pathology report generated successfully for P-0041 Arun Mehta.
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Report ID','Patient','Date Created','Key Finding','Status',''].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--outline-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...(generated ? [{ id: 'RPT-0024', patient: 'Arun Mehta', date: '2026-04-05', finding: 'GBM Grade IV · AI-Synthesized Differential', status: 'Final' }] : []), ...MOCK_REPORTS].map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(43,70,128,0.25)' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.id}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-bright)', fontSize: 13 }}>{r.patient}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{r.date}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{r.finding}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>{r.status}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ background: 'none', border: '1px solid var(--outline-dim)', color: 'var(--text-muted)', padding: '5px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={11} /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
