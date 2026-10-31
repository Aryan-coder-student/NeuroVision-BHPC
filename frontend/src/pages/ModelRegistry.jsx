import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Server } from 'lucide-react';

import { useAuth } from '../context/auth-context';
import { fetchAvailableModels } from '../services/api';


const CAPABILITY_LABELS = {
  segmentation: 'MRI Segmentation',
  vqa: 'Visual Question Answering',
};

function ConfigurationStatus({ isConfigured }) {
  const color = isConfigured ? 'var(--success)' : 'var(--text-muted)';
  return (
    <span style={{ color, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
      {isConfigured ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {isConfigured ? 'Configured' : 'Not configured'}
    </span>
  );
}

export default function ModelRegistry() {
  const { org } = useAuth();
  const [models, setModels] = useState([]);
  const [capability, setCapability] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchAvailableModels(org.id)
      .then(catalog => {
        if (active) setModels(catalog);
      })
      .catch(() => {
        if (active) setError('The configured model catalog could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [org.id]);

  const filteredModels = useMemo(
    () => models.filter(model => capability === 'all' || model.capability === capability),
    [capability, models],
  );

  return (
    <>
      <div className="model-registry-toolbar" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Neural Model Registry</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Server-configured inference models. Provider health is checked only when inference runs.
          </div>
        </div>
        <div className="model-registry-filters" style={{ display: 'flex', gap: 8 }}>
          {[
            ['all', 'All'],
            ['segmentation', 'Segmentation'],
            ['vqa', 'VQA'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setCapability(value)}
              style={{
                background: capability === value ? 'var(--primary-container)' : 'var(--bg-card)',
                color: capability === value ? 'var(--primary)' : 'var(--text-label)',
                border: `1px solid ${capability === value ? 'var(--primary)' : 'var(--outline-dim)'}`,
                padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="model-registry-table-wrap" style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)' }}>
        {loading && <p style={{ padding: 20, color: 'var(--text-muted)' }}>Loading configured models…</p>}
        {error && <p role="alert" style={{ padding: 20, color: 'var(--error)' }}>{error}</p>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Model ID', 'Model', 'Capability', 'Version', 'Provider', 'Configuration'].map(heading => (
                  <th key={heading} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid var(--outline-dim)' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredModels.map(model => (
                <tr key={model.id} style={{ borderBottom: '1px solid rgba(43,70,128,0.25)' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{model.id}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Server size={14} />{model.name}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{CAPABILITY_LABELS[model.capability]}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>{model.version}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{model.provider}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <ConfigurationStatus isConfigured={model.is_configured} />
                    <div style={{ fontSize: 10, color: 'var(--text-label)', marginTop: 4 }}>Availability: {model.availability.replaceAll('_', ' ')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
