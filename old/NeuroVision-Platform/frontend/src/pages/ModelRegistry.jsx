import { useState } from 'react';
import { Server, Activity, CheckCircle2, CloudLightning, Archive, Clock } from 'lucide-react';

const MODELS = [
  { id: '3d_unet_v2', name: '3D-UNet v2.1 (Optimized)', modality: 'MRI Segmentation', metric: '0.94 Dice', loss: 0.012, status: 'Deployed', date: '2026-03-15' },
  { id: '3d_unet_v1', name: '3D-UNet v1.0 (Legacy)', modality: 'MRI Segmentation', metric: '0.89 Dice', loss: 0.045, status: 'Archived', date: '2025-11-02' },
  { id: 'swin_unetr', name: 'SwinUNETR Medical', modality: 'MRI/CT Segmentation', metric: '0.81 Dice (Val)', loss: 0.104, status: 'In-Training', date: 'Active' },
  { id: 'blip_med_v1', name: 'BLIP-Med VQA v1', modality: 'Visual QA', metric: '91.5% F1', loss: 0.231, status: 'Deployed', date: '2026-03-28' },
  { id: 'llava_med_15', name: 'LLaVA-Med v1.5', modality: 'Visual QA', metric: '94.2% F1', loss: 0.189, status: 'Deployed', date: '2026-04-01' },
  { id: 'diag_rtd', name: 'RTD Subtype Classifier', modality: 'Genomic + MRI', metric: '—', loss: 0.540, status: 'In-Training', date: 'Active' },
];

const StatusBadge = ({ status }) => {
  if (status === 'Deployed') return <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}><CheckCircle2 size={12} /> Deployed</span>;
  if (status === 'Archived') return <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}><Archive size={12} /> Archived</span>;
  return <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}><Clock size={12} /> In-Training</span>;
};

// Mini sparkline component for loss simulation
const Sparkline = ({ seed }) => {
  const points = Array.from({ length: 10 }, (_, i) => `${i * 8},${15 - Math.random() * seed}`).join(' ');
  return (
    <svg width="80" height="20" viewBox="0 0 80 20">
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
    </svg>
  );
};

export default function ModelRegistry() {
  const [filter, setFilter] = useState('All');

  const filtered = MODELS.filter(m => filter === 'All' || m.status === filter);

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Neural Model Registry</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            System-wide manifest of trained AI models, performance telemetry, and deployment status.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Deployed', 'In-Training', 'Archived'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--primary-container)' : 'var(--bg-card)',
                color: filter === f ? 'var(--primary)' : 'var(--text-label)',
                border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--outline-dim)'}`,
                padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Model ID', 'Architecture / Name', 'Modality', 'Primary Metric', 'Loss Telemetry', 'Status'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid var(--outline-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(43,70,128,0.25)' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{row.id}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Server size={14} style={{ color: 'var(--text-muted)' }} />
                    {row.name}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{row.modality}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>{row.metric}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Sparkline seed={row.loss * 100} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>L:{row.loss.toFixed(3)}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
