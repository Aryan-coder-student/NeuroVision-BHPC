import { useState } from 'react';
import { MessageSquarePlus, CheckCircle2, Send } from 'lucide-react';

export default function ModelFeedback() {
  const [submitted, setSubmitted] = useState(false);
  
  const submitFeedback = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>Model Feedback & Requests</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Report incorrect predictions or request new capabilities from the ML engineering team.
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--outline-dim)', padding: 24, maxWidth: 600 }}>
        {submitted ? (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid var(--success)', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12, color: 'var(--success)' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Feedback submitted</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thank you. The ML team will review your report to refine future model weights.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={submitFeedback}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Target Model
              </label>
              <select className="field-input" required>
                <option value="">Select AI Model</option>
                <option value="3d_unet">3D Segmentation (U-Net)</option>
                <option value="vqa">Diagnostic Chat (VQA)</option>
                <option value="other">Platform / UI Issue</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Feedback Type
              </label>
              <select className="field-input" required>
                <option value="">Select Type</option>
                <option value="false_positive">False Positive</option>
                <option value="false_negative">False Negative</option>
                <option value="hallucination">Hallucination (Chat)</option>
                <option value="feature_req">Feature Request</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Scan ID (Optional)
              </label>
              <input className="field-input" placeholder="e.g., SCN-0089" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Detailed Description
              </label>
              <textarea 
                className="field-input" 
                rows={5} 
                placeholder="Describe what the model predicted versus the actual ground truth finding..." 
                required 
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{ background: 'var(--accent-primary)', color: 'var(--bg-void)', border: 'none', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={14} /> Send Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
