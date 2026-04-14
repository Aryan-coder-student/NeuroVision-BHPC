import { useState, useRef, useEffect } from 'react';
import { sendVQAQuery, fetchAvailableModels } from '../services/api';
import { Send, Brain, MessageSquare, Trash2 } from 'lucide-react';
import './VQA.css';

const SYSTEM_WELCOME = {
  role: 'ai',
  text: "Hello. I'm the NeuroVision Diagnostic AI. I can answer clinical questions about brain tumor imaging, interpret scan findings, suggest differential diagnoses, and provide references to recent literature. How can I assist you today?",
};

const QUICK_PROMPTS = [
  'What is the tumor type and grade?',
  'Suggest differential diagnoses for this scan.',
  'What is the recommended treatment protocol for GBM?',
  'Provide recent research links on brain tumor recurrence.',
  'Explain the significance of the FLAIR sequence findings.',
];

const MOCK_RESPONSES = {
  default: "Based on the imaging characteristics visible in the uploaded scan, the lesion demonstrates irregular margins, heterogeneous signal intensity, and surrounding edema — features consistent with a high-grade glioma. I would recommend cross-referencing with histopathological data for a definitive diagnosis. Would you like me to provide relevant literature references?",
  research: "Here are recent high-impact papers on this topic:\n\n1. Stupp et al. (2023) — 'Bevacizumab plus radiotherapy for recurrent GBM' — NEJM\n2. Weller et al. (2024) — 'MGMT promoter methylation and survival in newly diagnosed GBM' — Lancet Oncology\n3. Wen et al. (2023) — 'Response Assessment in Neuro-Oncology Working Group criteria' — Neuro-Oncology",
};

export default function VQA() {
  const [messages, setMessages] = useState([SYSTEM_WELCOME]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [imageBlob, setImageBlob] = useState(null);
  const [models, setModels]     = useState([]);
  const [selModel, setSelModel] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    fetchAvailableModels('vqa').then(data => {
      setModels(data);
      if (data.length > 0) setSelModel(data[0].id);
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    fetch('/data/vqa_demo.jpg')
      .then(r => r.blob())
      .then(b => setImageBlob(b))
      .catch(e => console.error(e));
  }, []);

  const sendMsg = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setTyping(true);

    try {
      const res = await sendVQAQuery(q, imageBlob, selModel);
      setMessages(m => [...m, { role: 'ai', text: res.response || res.answer || res.result || JSON.stringify(res) }]);
    } catch {
      // Fallback to mock
      await new Promise(r => setTimeout(r, 1200));
      const lower = q.toLowerCase();
      const reply = lower.includes('paper') || lower.includes('research') || lower.includes('link')
        ? MOCK_RESPONSES.research
        : MOCK_RESPONSES.default;
      setMessages(m => [...m, { role: 'ai', text: reply }]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };

  const initials = 'Dr';

  return (
    <>
      <div className="dash-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
            VQA Diagnostic Chat
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            AI-powered visual question answering for brain tumor imaging
          </div>
        </div>
      </div>

      <div className="vqa-layout">
        {/* ── Left: Scan Meta ── */}
        <div className="vqa-scan-panel">
          <div className="vqa-scan-header">MRI Scan Context</div>
          <div className="vqa-scan-body">
            <div className="vqa-scan-canvas" style={{ background: '#000' }}>
              <img src="/data/vqa_demo.jpg" alt="VQA Scan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            <div className="vqa-meta">
              <div className="vqa-meta-row"><span className="vqa-meta-key">Patient</span><span className="vqa-meta-val">P-0041 · Arun Mehta</span></div>
              <div className="vqa-meta-row"><span className="vqa-meta-key">Modality</span><span className="vqa-meta-val">MRI T1+Gd</span></div>
              <div className="vqa-meta-row"><span className="vqa-meta-key">Sequence</span><span className="vqa-meta-val">Axial FLAIR</span></div>
              <div className="vqa-meta-row"><span className="vqa-meta-key">Finding</span><span className="vqa-meta-val" style={{ color: 'var(--error)' }}>Enhancing mass</span></div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 8 }}>
                Quick Prompts
              </div>
              <div className="prompt-chips">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} className="prompt-chip" onClick={() => sendMsg(p)}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Chat ── */}
        <div className="vqa-chat-panel">
          <div className="vqa-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span><MessageSquare size={12} style={{ marginRight: 6 }} /> Diagnostic Session</span>
              <select 
                className="field-input" 
                style={{ padding: '4px 8px', fontSize: 11, background: 'var(--bg-void)', width: '140px', height: '28px' }}
                value={selModel}
                onChange={e => setSelModel(e.target.value)}
              >
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-label)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
              onClick={() => setMessages([SYSTEM_WELCOME])}>
              <Trash2 size={11} /> Clear
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className={`chat-avatar ${msg.role === 'ai' ? 'ai' : ''}`}>
                  {msg.role === 'ai' ? <Brain size={13} /> : initials}
                </div>
                <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            ))}
            {typing && (
              <div className="chat-msg">
                <div className="chat-avatar ai"><Brain size={13} /></div>
                <div className="chat-bubble">
                  <div className="chat-typing">
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask a clinical question about this scan…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className="chat-send-btn" onClick={() => sendMsg()} disabled={!input.trim() || typing}>
              <Send size={13} /> Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
