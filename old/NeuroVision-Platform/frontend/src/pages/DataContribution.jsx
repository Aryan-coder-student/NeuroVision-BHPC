import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export default function DataContribution() {
  const [submitted, setSubmitted] = useState(false);
  
  const submitData = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>Data Contribution</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Securely submit anonymized clinical datasets to improve NeuroVision AI models.
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)', padding: 24, maxWidth: 600 }}>
        {submitted ? (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid var(--success)', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12, color: 'var(--success)' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Dataset securely uploaded</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thank you for your contribution. The data will undergo independent review and anonymization vetting before entering the federated training queue.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={submitData}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Modality
              </label>
              <select className="field-input" required>
                <option value="">Select imaging modality</option>
                <option value="mri_t1">MRI T1-weighted</option>
                <option value="mri_t1c">MRI T1-contrast</option>
                <option value="mri_flair">MRI FLAIR</option>
                <option value="ct">CT Scan</option>
                <option value="other">Other / Multi-modal</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Primary Pathology
              </label>
              <input className="field-input" placeholder="e.g., Glioblastoma, Meningioma, Healthy Control" required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Dataset Upload (NIfTI / DICOM Archive)
              </label>
              <div style={{ border: '1px dashed var(--outline-dim)', background: 'var(--bg-void)', padding: 32, textAlign: 'center', cursor: 'pointer' }}>
                <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>Click to browse or drag ZIP archive here</div>
                <div style={{ fontSize: 11, color: 'var(--text-label)', marginTop: 8 }}>Max file size: 5GB per batch</div>
              </div>
            </div>

            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(238,125,119,0.05)', border: '1px solid rgba(238,125,119,0.3)', display: 'flex', gap: 12 }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>PHI Anonymization Requirement</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  By uploading, you certify that all Protected Health Information (PHI) has been stripped according to HIPAA guidelines. NeuroVision automated scrubbers will perform a secondary pass, but primary liability rests with the clinical org.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{ background: 'var(--accent-primary)', color: 'var(--bg-void)', border: 'none', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UploadCloud size={14} /> Submit Contribution
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
