import { useEffect, useState } from 'react';
import { CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { useSearchParams } from 'react-router-dom';
import {
  createModelFeedback, fetchAvailableModels, fetchModelFeedback,
} from '../services/api';
import { modelLabel } from '../services/model-catalog';

const card = { background: 'var(--bg-card)', border: '1px solid var(--outline-dim)', padding: 24, maxWidth: 760 };
const label = { display: 'block', margin: '12px 0 6px', fontSize: 12, color: 'var(--text-muted)' };

export default function ModelFeedback() {
  const { org } = useAuth();
  const [params] = useSearchParams();
  const [models, setModels] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    model_id: params.get('model_id') || '',
    category: '',
    description: '',
    report_id: params.get('report_id') || '',
    no_phi_attestation: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAvailableModels(org.id)
      .then(catalog => { if (active) setModels(catalog); })
      .catch(() => { if (active) setCatalogError('Unable to load model catalog.'); });
    fetchModelFeedback(org.id)
      .then(data => { if (active) setHistory(data.results || []); })
      .catch(() => { if (active) setLoadError('Could not load feedback history.'); });
    return () => { active = false; };
  }, [org.id]);

  const update = (name, value) => setForm(previous => ({ ...previous, [name]: value }));
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSubmitted(null);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.report_id) delete payload.report_id;
      const record = await createModelFeedback(org.id, payload);
      setSubmitted(record);
      setHistory(previous => [record, ...previous]);
      setForm(previous => ({ ...previous, category: '', description: '', report_id: '', no_phi_attestation: false }));
    } catch (e) {
      const details = e.response?.data;
      const message = details?.detail || Object.values(details || {}).flat().find(value => typeof value === 'string');
      setError(message || 'Failed to save feedback.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="feedback-title">
      <h1 id="feedback-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Model Feedback & Requests</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 18px' }}>
        Report model problems and submit feature requests for tenant-level review.
        Submitting feedback does not automatically train or change AI models.
      </p>
      <div style={card}>
        <p role="note" style={{ display: 'flex', gap: 10, color: 'var(--text-muted)', fontSize: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} /> Do not include patient names, scan IDs, personal details or identifiable health information.
        </p>
        {submitted && <p role="status" style={{ color: 'var(--success)' }}><CheckCircle2 size={15} /> Feedback saved — {submitted.status}</p>}
        {error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
        <form onSubmit={submit}>
          <label htmlFor="feedback-model" style={label}>Target model</label>
          <select id="feedback-model" required className="field-input" value={form.model_id} onChange={e => update('model_id', e.target.value)}>
            <option value="">Select model</option>
            {models.map(model => <option key={model.id} value={model.id}>{modelLabel(model)}</option>)}
            <option value="platform">Platform / UI</option>
          </select>
          {catalogError && <p role="status" style={{ color: 'var(--error)' }}>{catalogError}</p>}
          <label htmlFor="feedback-type" style={label}>Feedback type</label>
          <select id="feedback-type" className="field-input" required value={form.category} onChange={e => update('category', e.target.value)}>
            <option value="">Select type</option>
            <option value="false_positive">False positive (segmentation)</option>
            <option value="false_negative">False negative (segmentation)</option>
            <option value="hallucination">Incorrect VQA answer</option>
            <option value="feature_request">Feature request</option>
            <option value="ui_issue">Platform / UI issue</option>
          </select>
          {form.report_id && (
            <div role="note" style={{ margin: '14px 0', padding: 12, border: '1px solid var(--outline-dim)', color: 'var(--text-muted)', fontSize: 12 }}>
              Linked to the saved segmentation report you opened. The backend verifies that it belongs to this workspace and selected model.
              <button type="button" onClick={() => update('report_id', '')}
                style={{ marginLeft: 10, color: 'var(--accent-primary)', background: 'transparent', border: 0, cursor: 'pointer' }}>
                Remove report reference
              </button>
            </div>
          )}
          <label htmlFor="feedback-description" style={label}>Description (no protected health information)</label>
          <textarea id="feedback-description" required maxLength={2000} rows={5} className="field-input"
            value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="Describe the expected behavior and what went wrong without patient identifiers." />
          <label style={{ ...label, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <input type="checkbox" checked={form.no_phi_attestation}
              onChange={e => update('no_phi_attestation', e.target.checked)} required />
            I confirm this feedback contains no patient-identifying or protected health information.
          </label>
          <button type="submit" disabled={busy} style={{ marginTop: 16, cursor: 'pointer', border: 0, background: 'var(--accent-primary)', color: 'var(--bg-void)', padding: '11px 16px', display: 'flex', gap: 8 }}>
            <Send size={15} /> {busy ? 'Submitting…' : 'Send feedback'}
          </button>
        </form>
      </div>
      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={{ fontSize: 16, color: 'var(--text-bright)' }}>My submitted feedback</h2>
        {loadError && <p role="alert">{loadError}</p>}
        {!history.length && !loadError && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No feedback submitted yet.</p>}
        {history.map(item => <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--outline-dim)' }}>
          <strong style={{ color: 'var(--text-bright)' }}>{item.model_name} · {item.category.replaceAll('_', ' ')}</strong>
          <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>{item.status}</span>
          {item.reviewer_note && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Review: {item.reviewer_note}</p>}
        </div>)}
      </div>
    </section>
  );
}
