import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { createDatasetContribution, fetchDatasetContributions } from '../services/api';

const MAX_BYTES = 32 * 1024 * 1024;
const modalities = [
  ['t1', 'T1'], ['t1ce', 'T1 contrast (T1CE)'],
  ['t2', 'T2'], ['flair', 'FLAIR'],
];
const kinds = [
  ['nifti', 'Four MRI NIfTI volumes (BraTS)'],
  ['dicom_zip', 'One de-identified DICOM ZIP archive'],
];
const defaults = {
  title: '', modality: 'multi_modal', origin: 'public', description: '',
  license_info: '', source_url: '', sample_count: 1, no_phi_attestation: false,
};
const panel = { background: 'var(--bg-card)', border: '1px solid var(--outline-dim)', padding: 24, maxWidth: 760 };
const label = { display: 'block', margin: '12px 0 6px', fontSize: 12, color: 'var(--text-muted)' };

export default function DataContribution() {
  const { org } = useAuth();
  const [form, setForm] = useState(defaults);
  const [format, setFormat] = useState('nifti');
  const [files, setFiles] = useState({});
  const [inputKey, setInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetchDatasetContributions(org.id)
      .then(data => { if (active) setHistory(data.results || []); })
      .catch(() => { if (active) setLoadError('Unable to load uploaded datasets.'); });
    return () => { active = false; };
  }, [org.id]);

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const chooseFormat = value => {
    setFormat(value);
    setFiles({});
    setInputKey(key => key + 1);
  };
  const selected = format === 'nifti'
    ? modalities.every(([key]) => files[key])
    : Boolean(files.dicom_archive);

  const submit = async event => {
    event.preventDefault();
    if (submitting || !selected) return;
    for (const file of Object.values(files)) {
      if (!file || file.size === 0 || file.size > MAX_BYTES) {
        setError('Each selected file must be between 1 byte and 32 MiB.');
        return;
      }
    }
    setSubmitting(true);
    setSubmitted(null);
    setError('');
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    Object.entries(files).forEach(([key, file]) => payload.append(key, file, file.name));
    try {
      const saved = await createDatasetContribution(org.id, payload);
      setSubmitted(saved);
      setHistory(existing => [saved, ...existing]);
      setForm(defaults);
      setFiles({});
      setInputKey(key => key + 1);
    } catch (failure) {
      const details = failure.response?.data;
      const message = details?.detail || Object.values(details || {}).flat().find(value => typeof value === 'string');
      setError(message || 'Private upload failed. No contribution was recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="contrib-title">
      <h1 id="contrib-title" style={{ fontSize: 22, color: 'var(--text-bright)' }}>Data Contribution</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 18px' }}>
        Upload de-identified research MRI scans to private Hugging Face bucket storage. Your workspace retains the upload record.
      </p>
      <div style={panel}>
        <div role="note" style={{ display: 'flex', gap: 10, padding: 12, background: 'var(--bg-card-high)', color: 'var(--text-muted)', fontSize: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          Research/demo files only. This form does not remove DICOM identifiers, certify HIPAA compliance, or start model training.
          Do not upload identifiable patient scans.
        </div>
        {submitted && (
          <p role="status" style={{ color: 'var(--success)', fontSize: 13 }}>
            <CheckCircle2 size={15} /> {submitted.file_count} file(s) saved privately ({(submitted.total_bytes / 1048576).toFixed(1)} MiB).
          </p>
        )}
        {error && <p role="alert" style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p>}
        <form onSubmit={submit}>
          <label style={label} htmlFor="dataset-title">Dataset title (no patient details)</label>
          <input id="dataset-title" className="field-input" required maxLength={160}
            value={form.title} onChange={e => change('title', e.target.value)} placeholder="e.g. BraTS public research volumes" />
          <label style={label} htmlFor="dataset-format">Upload type</label>
          <select id="dataset-format" className="field-input" value={format} onChange={e => chooseFormat(e.target.value)}>
            {kinds.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
          <div key={inputKey} style={{ border: '1px dashed var(--outline-dim)', padding: 16, marginTop: 12 }}>
            <UploadCloud size={24} aria-hidden="true" />
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Each file: maximum 32 MiB. 4 NIfTI files or 1 ZIP. No public file URLs.
            </p>
            {format === 'nifti' ? modalities.map(([key, name]) => (
              <div key={key}>
                <label style={label} htmlFor={`dataset-${key}`}>{name} (.nii or .nii.gz)</label>
                <input id={`dataset-${key}`} type="file" accept=".nii,.gz,.nii.gz" required
                  onChange={e => setFiles(current => ({ ...current, [key]: e.target.files?.[0] }))} />
              </div>
            )) : (
              <div>
                <label style={label} htmlFor="dataset-dicom">DICOM Part-10 .dcm files in ZIP archive</label>
                <input id="dataset-dicom" type="file" accept=".zip" required
                  onChange={e => setFiles(current => ({ ...current, dicom_archive: e.target.files?.[0] }))} />
              </div>
            )}
          </div>
          <label style={label} htmlFor="dataset-origin">Source type</label>
          <select id="dataset-origin" className="field-input" required value={form.origin} onChange={e => change('origin', e.target.value)}>
            <option value="public">Public research dataset</option>
            <option value="synthetic">Synthetic data</option>
            <option value="deidentified">De-identified research dataset</option>
          </select>
          <label style={label} htmlFor="dataset-modality">Primary modality</label>
          <select id="dataset-modality" className="field-input" required value={form.modality} onChange={e => change('modality', e.target.value)}>
            <option value="multi_modal">Multiple MRI modalities</option>
            <option value="mri_t1">MRI T1</option>
            <option value="mri_t1ce">MRI T1CE</option>
            <option value="mri_t2">MRI T2</option>
            <option value="mri_flair">MRI FLAIR</option>
            <option value="other">Other</option>
          </select>
          <label style={label} htmlFor="dataset-count">Number of research samples</label>
          <input id="dataset-count" className="field-input" type="number" required min={1} max={10000000}
            value={form.sample_count} onChange={e => change('sample_count', Number(e.target.value))} />
          <label style={label} htmlFor="dataset-license">License / permission to store and use</label>
          <input id="dataset-license" className="field-input" required maxLength={160}
            value={form.license_info} onChange={e => change('license_info', e.target.value)} placeholder="e.g. BraTS dataset license" />
          <label style={label} htmlFor="dataset-url">Public source URL (optional)</label>
          <input id="dataset-url" className="field-input" type="url" maxLength={500}
            value={form.source_url} onChange={e => change('source_url', e.target.value)} />
          <label style={label} htmlFor="dataset-notes">Description (no patient identifiers)</label>
          <textarea id="dataset-notes" className="field-input" rows={4} required maxLength={1000}
            value={form.description} onChange={e => change('description', e.target.value)} />
          <label style={{ ...label, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" required checked={form.no_phi_attestation}
              onChange={e => change('no_phi_attestation', e.target.checked)} />
            I confirm these files and metadata are de-identified and I have permission to upload them.
          </label>
          <button type="submit" disabled={submitting || !selected}
            style={{ marginTop: 16, background: 'var(--accent-primary)', color: 'var(--bg-void)', border: 0, padding: '11px 16px', cursor: 'pointer' }}>
            {submitting ? 'Uploading privately…' : 'Upload research dataset'}
          </button>
        </form>
      </div>
      <div style={{ ...panel, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, color: 'var(--text-bright)' }}>My uploaded datasets</h2>
        {loadError && <p role="alert" style={{ color: 'var(--error)' }}>{loadError}</p>}
        {!history.length && !loadError && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No uploaded datasets yet.</p>}
        {history.map(item => (
          <div key={item.id} style={{ borderBottom: '1px solid var(--outline-dim)', padding: '12px 0' }}>
            <strong style={{ color: 'var(--text-bright)' }}>{item.title}</strong>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {item.file_count} file(s), {(item.total_bytes / 1048576).toFixed(1)} MiB · {item.format} · {item.status}
            </p>
            {item.review_note && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.review_note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
