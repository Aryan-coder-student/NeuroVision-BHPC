import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { createDatasetContribution, fetchDatasetContributions } from '../services/api';

const originOptions = [
  ['public', 'Public dataset'],
  ['synthetic', 'Synthetic research data'],
  ['deidentified', 'De-identified research data'],
];
const modalities = [
  ['mri_t1', 'MRI T1'], ['mri_t1ce', 'MRI T1 contrast'],
  ['mri_t2', 'MRI T2'], ['mri_flair', 'MRI FLAIR'],
  ['multi_modal', 'Multiple MRI modalities'], ['other', 'Other'],
];
const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--outline-dim)', padding: 24, maxWidth: 760 };
const fieldStyle = { display: 'block', fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 6px' };

export default function DataContribution() {
  const { org } = useAuth();
  const [form, setForm] = useState({
    title: '', modality: '', origin: '', description: '', license_info: '',
    source_url: '', sample_count: 1, no_phi_attestation: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetchDatasetContributions(org.id)
      .then(data => { if (active) setHistory(data.results || []); })
      .catch(() => { if (active) setLoadError('Unable to load contribution requests.'); });
    return () => { active = false; };
  }, [org.id]);

  const update = (name, value) => setForm(current => ({ ...current, [name]: value }));
  const send = async event => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitted(null);
    setError('');
    try {
      const record = await createDatasetContribution(org.id, form);
      setSubmitted(record);
      setHistory(previous => [record, ...previous]);
      setForm({ title: '', modality: '', origin: '', description: '', license_info: '', source_url: '', sample_count: 1, no_phi_attestation: false });
    } catch (e) {
      const detail = e.response?.data;
      const message = detail?.detail || Object.values(detail || {}).flat().find(value => typeof value === 'string');
      setError(message || 'Could not submit your dataset review request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="contributions-title">
      <h1 id="contributions-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Data Contribution</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 18px' }}>
        Propose a research dataset for review. This form saves metadata only — it does not upload MRI/DICOM files, anonymize scans, or queue model training.
      </p>
      <div style={cardStyle}>
        <div role="note" style={{ display: 'flex', gap: 9, padding: 12, background: 'var(--bg-card-high)', color: 'var(--text-muted)', fontSize: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          Do not enter patient names, scan IDs, dates of birth, personal links or other identifiable health information. Secure file intake is not enabled for this deployment.
        </div>
        {submitted && <p role="status" style={{ color: 'var(--success)', fontSize: 13 }}><CheckCircle2 size={15} /> Request submitted ({submitted.status}). No files were uploaded.</p>}
        {error && <p role="alert" style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p>}
        <form onSubmit={send}>
          <label style={fieldStyle} htmlFor="contrib-title">Dataset title</label>
          <input id="contrib-title" className="field-input" required maxLength={160} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Public BraTS reference subset" />
          <label style={fieldStyle} htmlFor="contrib-modality">Imaging modality</label>
          <select id="contrib-modality" className="field-input" required value={form.modality} onChange={e => update('modality', e.target.value)}>
            <option value="">Select modality</option>
            {modalities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label style={fieldStyle} htmlFor="contrib-origin">Data origin</label>
          <select id="contrib-origin" className="field-input" required value={form.origin} onChange={e => update('origin', e.target.value)}>
            <option value="">Select origin</option>
            {originOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label style={fieldStyle} htmlFor="contrib-samples">Approximate sample count</label>
          <input id="contrib-samples" className="field-input" type="number" min="1" max="10000000" required value={form.sample_count} onChange={e => update('sample_count', Number(e.target.value))} />
          <label style={fieldStyle} htmlFor="contrib-license">Dataset license / usage rights</label>
          <input id="contrib-license" className="field-input" maxLength={160} required value={form.license_info} onChange={e => update('license_info', e.target.value)} placeholder="e.g. CC BY 4.0; must verify rights" />
          <label style={fieldStyle} htmlFor="contrib-source">Public source URL (optional)</label>
          <input id="contrib-source" className="field-input" type="url" maxLength={500} value={form.source_url} onChange={e => update('source_url', e.target.value)} placeholder="https://example.org/dataset" />
          <label style={fieldStyle} htmlFor="contrib-description">Research dataset description (no patient details)</label>
          <textarea id="contrib-description" className="field-input" rows={4} required maxLength={1000} value={form.description} onChange={e => update('description', e.target.value)} />
          <label style={{ ...fieldStyle, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <input type="checkbox" checked={form.no_phi_attestation} onChange={e => update('no_phi_attestation', e.target.checked)} required />
            I confirm the supplied metadata contains no patient identifiers or protected health information.
          </label>
          <button type="submit" disabled={submitting} style={{ marginTop: 16, cursor: 'pointer', background: 'var(--accent-primary)', color: 'var(--bg-void)', border: 0, padding: '11px 16px', display: 'flex', gap: 8 }}>
            <Send size={15} /> {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      </div>
      <div style={{ ...cardStyle, marginTop: 18 }}>
        <h2 style={{ fontSize: 16, color: 'var(--text-bright)' }}>My contribution requests</h2>
        {loadError && <p role="alert">{loadError}</p>}
        {!history.length && !loadError && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No requests submitted yet.</p>}
        {history.map(item => <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--outline-dim)' }}>
          <strong style={{ color: 'var(--text-bright)' }}>{item.title}</strong>
          <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>{item.status.replaceAll('_', ' ')}</span>
          {item.review_note && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Review: {item.review_note}</p>}
        </div>)}
      </div>
    </section>
  );
}
