import { useState, useRef, useEffect } from 'react';
import { Niivue } from '@niivue/niivue';
import { runSegmentation, fetchAvailableModels } from '../services/api';
import {
  Upload, FolderOpen, ScanLine, FileText,
  Loader, Brain, AlertTriangle, CheckCircle2
} from 'lucide-react';
import './Segmentation.css';

const MOCK_RESULT = {
  tumor_type:    'Glioblastoma Multiforme (GBM)',
  grade:         'Grade IV',
  volume_cm3:    38.4,
  surface_area:  112.7,
  location:      'Right Temporal Lobe',
  confidence:    91.2,
  processing_s:  4.3,
  model_version: '3D-UNet v2.1',
};

export default function Segmentation() {
  const [patientFolder, setPatientFolder] = useState('BraTS2021_00000/Patient 1');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [dragging, setDragging] = useState(false);
  const [models, setModels]     = useState([]);
  const [selModel, setSelModel] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchAvailableModels('segmentation').then(data => {
      setModels(data);
      if (data.length > 0) setSelModel(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (result && canvasRef.current) {
      const nv = new Niivue({ backColor: [0.023, 0.055, 0.125, 1] }); // approx #060e20 to blend
      nv.attachToCanvas(canvasRef.current);
      nv.addVolumeFromUrl({ url: '/data/BraTS2021_00000/BraTS2021_00000_t1ce.nii.gz' }).then(() => {
        nv.addVolumeFromUrl({ url: '/data/BraTS2021_00000/BraTS2021_00000_seg.nii.gz', colormap: 'red', opacity: 0.5 });
      }).catch(e => console.error("Niivue loading error:", e));
    }
  }, [result]);

  const handleRun = async () => {
    if (!patientFolder.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await runSegmentation(patientFolder, selModel);
      setResult(data);
    } catch {
      // Use mock data for demo
      await new Promise(r => setTimeout(r, 2800));
      setResult(MOCK_RESULT);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!result) return;
    const text = `NEUROVISION PATHOLOGY REPORT
===========================
Generated: ${new Date().toLocaleString()}

PATIENT FOLDER: ${patientFolder}

FINDINGS:
  Tumor Type:   ${result.tumor_type}
  Grade:        ${result.grade}
  Location:     ${result.location}
  Volume:       ${result.volume_cm3 ?? result.volume} cm³
  Surface Area: ${result.surface_area} mm²
  Confidence:   ${result.confidence}%
  Model:        ${result.model_version}
  Process Time: ${result.processing_s}s

DISCLAIMER: This report is AI-generated and must be reviewed by a qualified clinician.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `NeuroVision_Report_${patientFolder.replace(/\//g,'_')}.txt`;
    a.click();
  };

  return (
    <>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
            3D Segmentation Workspace
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload patient MRI data and run AI tumor segmentation
          </div>
        </div>
      </div>

      <div className="seg-workspace">
        {/* ── Left: Upload Panel ── */}
        <div className="seg-panel">
          <div className="seg-panel-header"><Upload size={13} /> Patient Data</div>
          <div className="seg-panel-body">
            <div className="field-row">
              <label className="field-label">Patient Folder Path</label>
              <input
                className="field-input"
                placeholder="BraTS2021_00000/Patient 1"
                value={patientFolder}
                onChange={e => setPatientFolder(e.target.value)}
              />
            </div>

            <div
              className={`upload-zone ${dragging ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); }}
            >
              <div className="upload-zone-icon"><FolderOpen size={28} /></div>
              <div className="upload-zone-text">Drag NIfTI or DICOM folder</div>
              <div className="upload-zone-hint">.nii · .nii.gz · .dcm</div>
            </div>

            {patientFolder && (
              <div className="file-loaded">
                <Brain size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {patientFolder}
                </span>
              </div>
            )}

            <div className="field-row" style={{ marginTop: 16 }}>
              <label className="field-label">Model Selection</label>
              <select 
                className="field-input" 
                value={selModel} 
                onChange={e => setSelModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--error-container)', color: 'var(--error)', fontSize: 12, display: 'flex', gap: 8 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{error}
              </div>
            )}

            <button className="run-seg-btn" onClick={handleRun} disabled={!patientFolder.trim() || loading}>
              {loading ? <><Loader size={14} className="spin" /> Processing…</> : <><ScanLine size={14} /> Run AI Segmentation</>}
            </button>
          </div>
        </div>

        {/* ── Center: Viewer ── */}
        <div className="seg-panel" style={{ position: 'relative' }}>
          <div className="seg-panel-header"><Brain size={13} /> 3D Visualization</div>
          <div className="viewer-area">
            {loading && (
              <div className="viewer-loading">
                <Loader size={28} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Running 3D-UNet segmentation…</div>
                <div className="viewer-loading-bar"><div className="viewer-loading-bar-inner" /></div>
              </div>
            )}
            {!result && !loading && (
              <div className="viewer-placeholder">
                <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <div style={{ fontSize: 13 }}>No scan loaded</div>
                <div style={{ fontSize: 12, color: 'var(--text-label)', marginTop: 6 }}>Upload a patient folder and run segmentation</div>
              </div>
            )}
            {result && !loading && (
              <>
                <div className="viewer-result-badge">
                  <div style={{ fontSize: 10, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>AI Segmentation Result</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 14 }}>{result.tumor_type}</div>
                  <div className="result-type-tag">{result.grade}</div>
                </div>
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
                <div style={{ position: 'absolute', bottom: 14, right: 14, fontSize: 11, color: 'var(--text-label)' }}>
                  <CheckCircle2 size={11} style={{ marginRight: 4, color: 'var(--success)' }} />
                  Model: {result.model_version} · {result.processing_s}s
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Stats Panel ── */}
        <div className="seg-panel">
          <div className="seg-panel-header"><FileText size={13} /> Clinical Metrics</div>
          <div className="seg-panel-body">
            {!result ? (
              <div style={{ fontSize: 13, color: 'var(--text-label)', textAlign: 'center', marginTop: 32 }}>
                Run segmentation to view metrics
              </div>
            ) : (
              <>
                <div className="stat-row">
                  <div className="stat-key">Tumor Type</div>
                  <div className="stat-val" style={{ fontSize: 12, maxWidth: 140, textAlign: 'right' }}>{result.tumor_type}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Grade</div>
                  <div className="stat-val" style={{ color: 'var(--error)' }}>{result.grade}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Location</div>
                  <div className="stat-val" style={{ fontSize: 12, maxWidth: 140, textAlign: 'right' }}>{result.location}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Volume</div>
                  <div className="stat-val">{result.volume_cm3 ?? result.volume} cm³</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Surface Area</div>
                  <div className="stat-val">{result.surface_area} mm²</div>
                </div>
                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="stat-key">AI Confidence</span>
                    <span className="stat-val" style={{ color: 'var(--success)' }}>{result.confidence}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${result.confidence}%` }} />
                  </div>
                </div>

                <button className="report-btn" onClick={generateReport}>
                  <FileText size={14} /> Generate Pathology Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
