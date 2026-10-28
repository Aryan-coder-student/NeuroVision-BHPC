import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Niivue } from '@niivue/niivue';
import { runSegmentation, fetchAvailableModels } from '../services/api';
import {
  ScanLine, FileText,
  Loader, Brain, AlertTriangle, CheckCircle2, FlaskConical
} from 'lucide-react';
import { SAMPLE_SEGMENTATION, SAMPLE_VOLUMES, SAMPLE_VIEWS, applySampleView } from './segmentation-demo';
import './Segmentation.css';

function formatMetric(value, unit) {
  return value == null ? 'Not available' : `${value}${unit}`;
}

export default function Segmentation() {
  const { patient } = useOutletContext();
  const [patientFolder, setPatientFolder] = useState('');
  const [source, setSource] = useState('sample');
  const [sampleView, setSampleView] = useState('overlay');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [models, setModels]     = useState([]);
  const [selModel, setSelModel] = useState('');
  const [viewerStatus, setViewerStatus] = useState('idle');
  const [sampleLoadRequest, setSampleLoadRequest] = useState(0);
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const isSample = result?.source === 'sample';

  useEffect(() => {
    let active = true;
    fetchAvailableModels('segmentation').then(data => {
      if (active) {
        setModels(data);
        if (data.length > 0) setSelModel(data[0].id);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isSample || !canvasRef.current) return undefined;

    let active = true;
    const nv = new Niivue({ backColor: [0.023, 0.055, 0.125, 1] });
    niivueRef.current = nv;

    const loadSampleVolumes = async () => {
      setViewerStatus('loading');
      try {
        await nv.attachToCanvas(canvasRef.current);
        if (!active) return;
        await nv.loadVolumes(SAMPLE_VOLUMES.map(volume => ({ ...volume })));
        if (!active) return;
        applySampleView(nv, 'overlay');
        setViewerStatus('ready');
      } catch {
        if (active) setViewerStatus('error');
      }
    };

    loadSampleVolumes();
    return () => {
      active = false;
      if (niivueRef.current === nv) niivueRef.current = null;
      nv.cleanup();
    };
  }, [isSample, sampleLoadRequest]);

  useEffect(() => {
    if (isSample && viewerStatus === 'ready' && niivueRef.current) {
      applySampleView(niivueRef.current, sampleView);
    }
  }, [isSample, viewerStatus, sampleView]);

  const handleSourceChange = (nextSource) => {
    if (loading) return;
    setSource(nextSource);
    setResult(null);
    setError('');
    setViewerStatus('idle');
  };

  const handleLoadSample = () => {
    setLoading(false);
    setError('');
    setViewerStatus('loading');
    setSampleView('overlay');
    setResult(SAMPLE_SEGMENTATION);
    setSampleLoadRequest(request => request + 1);
  };

  const handleRun = async () => {
    if (source === 'sample') {
      handleLoadSample();
      return;
    }
    if (!patientFolder.trim() || loading) return;
    setLoading(true); setError(''); setResult(null); setViewerStatus('idle');
    try {
      const data = await runSegmentation(patientFolder, selModel);
      setResult(data);
    } catch {
      setError('Segmentation service is unavailable. No clinical result was saved.');
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
PATIENT ID: ${patient.patient_code}
PATIENT: ${patient.display_name}

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
    a.download = `NeuroVision_Report_${patient.patient_code.replace(/[^a-z0-9_-]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="seg-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
            3D Segmentation Workspace
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {patient.patient_code} · {source === 'sample' ? 'Research reference data, not linked to this patient' : 'Experimental patient inference'}
          </div>
        </div>
        <span className="sample-availability"><FlaskConical size={14} /> BraTS 2021 reference dataset</span>
      </div>

      <div className="seg-workspace">
        {/* ── Left: Upload Panel ── */}
        <div className="seg-panel">
          <div className="seg-panel-header"><ScanLine size={13} /> Data Source</div>
          <div className="seg-panel-body">
            <fieldset className="seg-source-picker">
              <legend className="field-label">Data source</legend>
              <label className={`seg-source-option ${source === 'sample' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" checked={source === 'sample'}
                  onChange={() => handleSourceChange('sample')} disabled={loading} />
                BraTS 2021 sample
              </label>
              <label className={`seg-source-option ${source === 'patient' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" checked={source === 'patient'}
                  onChange={() => handleSourceChange('patient')} disabled={loading} />
                Patient study (experimental)
              </label>
            </fieldset>

            {source === 'sample' ? (
              <div className="sample-data-note" role="note">
                Run to inspect the bundled T1CE MRI, tumor reference mask and 3D overlay.
                This is a demonstration, not a model prediction or a patient scan.
              </div>
            ) : (
              <>
                <div className="field-row">
                  <label className="field-label" htmlFor="seg-patient-folder">Patient Folder Path</label>
                  <input
                    id="seg-patient-folder" className="field-input"
                    placeholder="Path accessible to the inference service"
                    value={patientFolder} onChange={e => setPatientFolder(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="seg-service-note">
                  Requires a locally running Flask segmentation service. The path is
                  resolved by that service, not uploaded from the browser.
                </p>
                {patientFolder && (
                  <div className="file-loaded">
                    <Brain size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span className="seg-path-display">{patientFolder}</span>
                  </div>
                )}
                <div className="field-row" style={{ marginTop: 16 }}>
                  <label className="field-label" htmlFor="seg-model">Model Selection</label>
                  <select id="seg-model" className="field-input" value={selModel}
                    onChange={e => setSelModel(e.target.value)} disabled={loading}>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {error && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--error-container)', color: 'var(--error)', fontSize: 12, display: 'flex', gap: 8 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{error}
              </div>
            )}

            <button type="button" className="run-seg-btn" onClick={handleRun} disabled={loading || (source === 'patient' && !patientFolder.trim())}>
              {loading ? <><Loader size={14} className="spin" /> Processing…</> : <><ScanLine size={14} /> Run AI Segmentation</>}
            </button>
          </div>
        </div>

        {/* ── Center: Viewer ── */}
        <div className="seg-panel" style={{ position: 'relative' }}>
          <div className="seg-panel-header"><Brain size={13} /> MRI and Segmentation Viewer</div>
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
                <div style={{ fontSize: 12, color: 'var(--text-label)', marginTop: 6 }}>{source === 'sample' ? 'Run to explore the bundled BraTS sample MRI and mask' : 'Enter a service-side study path to run inference'}</div>
              </div>
            )}
            {isSample && !loading && (
              <>
                <canvas ref={canvasRef} aria-label="Interactive sample MRI and reference tumor segmentation viewer" style={{ width: '100%', height: '100%', display: 'block' }} />
                {viewerStatus === 'loading' && (
                  <div className="viewer-loading">
                    <Loader size={28} className="spin" />
                    <div className="viewer-loading-copy">Loading sample MRI and mask…</div>
                  </div>
                )}
                {viewerStatus === 'error' && (
                  <div className="viewer-placeholder viewer-error" role="alert">
                    <AlertTriangle size={30} />
                    <div>Sample volume could not be loaded</div>
                    <button className="sample-retry-btn" type="button" onClick={handleLoadSample}>Try again</button>
                  </div>
                )}
                {viewerStatus === 'ready' && (
                  <>
                    <div className="viewer-toolbar" role="group" aria-label="Sample MRI visualization mode">
                      {SAMPLE_VIEWS.map(view => (
                        <button key={view.id} type="button"
                          className={`viewer-mode-btn ${sampleView === view.id ? 'active' : ''}`}
                          onClick={() => setSampleView(view.id)}
                          aria-pressed={sampleView === view.id}>
                          {view.label}
                        </button>
                      ))}
                    </div>
                    <div className="viewer-result-badge">
                      <div className="viewer-result-label">{sampleView === 'mri' ? 'Original T1CE MRI' : sampleView === 'mask' ? 'Reference tumor mask' : sampleView === 'render' ? '3D MRI + mask overlay' : 'MRI + reference mask'}</div>
                      <div className="viewer-result-title">{result.tumor_type}</div>
                      <div className="result-type-tag sample">{result.grade}</div>
                    </div>
                    <div className="viewer-model-note">
                      <CheckCircle2 size={11} /> BraTS 2021 reference annotation · no AI inference
                    </div>
                  </>
                )}
              </>
            )}
            {result && !isSample && !loading && (
              <div className="viewer-placeholder">
                <CheckCircle2 size={36} className="viewer-success-icon" />
                <div>Segmentation completed</div>
                <div className="viewer-placeholder-detail">The service did not return a preview volume.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Stats Panel ── */}
        <div className="seg-panel">
          <div className="seg-panel-header"><FileText size={13} /> {isSample ? 'Sample Metrics' : 'Inference Metrics'}</div>
          <div className="seg-panel-body">
            {!result ? (
              <div style={{ fontSize: 13, color: 'var(--text-label)', textAlign: 'center', marginTop: 32 }}>
                Run segmentation to view metrics
              </div>
            ) : (
              <>
                {isSample && (
                  <div className="sample-data-note" role="note">
                    Demo data only. This sample is not linked to {patient.patient_code} and is not saved as a clinical record.
                  </div>
                )}
                <div className="stat-row">
                  <div className="stat-key">{isSample ? 'Dataset content' : 'Tumor Type'}</div>
                  <div className="stat-val" style={{ fontSize: 12, maxWidth: 140, textAlign: 'right' }}>{result.tumor_type}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">{isSample ? 'Annotation' : 'Grade'}</div>
                  <div className="stat-val" style={{ color: isSample ? 'var(--text-bright)' : 'var(--error)' }}>{result.grade}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Location</div>
                  <div className="stat-val" style={{ fontSize: 12, maxWidth: 140, textAlign: 'right' }}>{result.location}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Volume</div>
                  <div className="stat-val">{formatMetric(result.volume_cm3 ?? result.volume, ' cm³')}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-key">Surface Area</div>
                  <div className="stat-val">{formatMetric(result.surface_area, ' mm²')}</div>
                </div>
                {result.confidence != null && (
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="stat-key">AI Confidence</span>
                      <span className="stat-val" style={{ color: 'var(--success)' }}>{result.confidence}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${result.confidence}%` }} />
                    </div>
                  </div>
                )}

                {!isSample && (
                  <button className="report-btn" onClick={generateReport}>
                    <FileText size={14} /> Generate Pathology Report
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
