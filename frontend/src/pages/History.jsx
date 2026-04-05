import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScanLine, Download, MessageSquare } from 'lucide-react';

const HISTORY = [
  { id: 'SCN-0089', patient: 'Arun Mehta',     type: 'MRI T1+', result: 'GBM Grade IV',       confidence: 91, date: '2026-04-05 10:14', status: 'Report Ready' },
  { id: 'SCN-0088', patient: 'Leela Krishnan', type: 'MRI FLAIR', result: 'Meningioma Grade I', confidence: 87, date: '2026-04-04 15:42', status: 'Under Review' },
  { id: 'SCN-0087', patient: 'Vikram Rao',     type: 'MRI T2',   result: 'Low-Grade Glioma',   confidence: 93, date: '2026-04-04 09:23', status: 'Report Ready' },
  { id: 'SCN-0086', patient: 'Sunita Pillai',  type: 'MRI T1+',  result: 'Pending',             confidence: null, date: '2026-04-03 17:05', status: 'Pending' },
  { id: 'SCN-0085', patient: 'Deepak Joshi',   type: 'CT Angio', result: 'No Mass Detected',   confidence: 96, date: '2026-04-03 11:30', status: 'Report Ready' },
  { id: 'SCN-0084', patient: 'Arun Mehta',     type: 'MRI FLAIR', result: 'GBM Grade IV (Pre-op)', confidence: 89, date: '2026-03-28 08:55', status: 'Report Ready' },
];

const STATUS_COLOR = { 'Report Ready': 'var(--success)', 'Under Review': 'var(--warning)', 'Pending': 'var(--text-label)' };

export default function History() {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>Scan History</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Complete record of all segmentation runs for this organization</div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Scan ID','Patient','Scan Type','AI Result','Confidence','Date','Status','Actions'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--outline-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORY.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(43,70,128,0.25)' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{row.id}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>{row.patient}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{row.type}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{row.result}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: row.confidence >= 90 ? 'var(--success)' : row.confidence ? 'var(--warning)' : 'var(--text-label)' }}>
                  {row.confidence ? `${row.confidence}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{row.date}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[row.status] || 'var(--text-muted)' }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => navigate('/segmentation')} style={{ background: 'none', border: '1px solid var(--outline-dim)', color: 'var(--text-muted)', padding: '5px 9px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ScanLine size={11} /> View
                    </button>
                    <button onClick={() => navigate('/vqa')} style={{ background: 'none', border: '1px solid var(--outline-dim)', color: 'var(--text-muted)', padding: '5px 9px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={11} /> Chat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
