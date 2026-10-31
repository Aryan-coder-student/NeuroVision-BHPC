import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Niivue } from '@niivue/niivue';
import {
  AlertTriangle, Brain, CheckCircle2, FileOutput, FlaskConical, FolderOpen, ScanLine, Loader,
} from 'lucide-react';
import {
  SAMPLE_SEGMENTATION, SAMPLE_VOLUMES, SAMPLE_VIEWS, applySampleView,
} from './segmentation-demo';
import { MRI_MODALITIES, resolveBraTSFolder, formatFileSize } from './segmentation-files';
import { runSegmentation, fetchAvailableModels, recordImagingStudy } from '../services/api';
import { configuredModels } from '../services/model-catalog';
import './Segmentation.css';

export default function Segmentation() {
  const { patient, workspaceId } = useOutletContext();
  const { org } = useAuth();
  const [source, setSource] = useState('sample');
  const [folder, setFolder] = useState({ files: {}, error: '', folderName: '' });
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedStudy, setRecordedStudy] = useState(null);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [viewMode, setViewMode] = useState('overlay');
  const [viewerStatus, setViewerStatus] = useState('idle');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const inferenceSequenceRef = useRef(0);
  const isSample = preview?.type === 'sample';
  const hasMask = isSample || preview?.type === 'predicted';

  useEffect(() => {
    let mounted = true;
    fetchAvailableModels(workspaceId, 'segmentation')
      .then(data => {
        if (!mounted) return;
        const selectable = configuredModels(data, 'segmentation');
        setModels(selectable);
        setModelId(selectable[0]?.id ?? '');
        setCatalogError(selectable.length ? '' : 'MRI model inference is not configured yet.');
      })
      .catch(() => {
        if (mounted) setCatalogError('Unable to load the model catalog.');
      });
    return () => { mounted = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!preview || !canvasRef.current) return undefined;
    let active = true;
    const urls = [];
    const nv = new Niivue({
      backColor: [0.023, 0.055, 0.125, 1],
      dragAndDropEnabled: false,
    });
    niivueRef.current = nv;
    const load = async () => {
      setViewerStatus('loading');
      try {
        await nv.attachToCanvas(canvasRef.current);
        if (!active) return;
        let volumes;
        if (preview.type === 'sample') {
          volumes = SAMPLE_VOLUMES.map(volume => ({ ...volume }));
        } else {
          const selected = preview.files.t1ce;
          const uri = URL.createObjectURL(selected);
          urls.push(uri);
          volumes = [{ url: uri, name: selected.name, colormap: 'gray' }];
          if (preview.type === 'predicted') {
            const maskUri = URL.createObjectURL(preview.mask);
            urls.push(maskUri);
            volumes.push({ url: maskUri, name: 'predicted_mask.nii.gz', colormap: 'red', opacity: 0.55 });
          }
        }
        await nv.loadVolumes(volumes);
        if (!active) return;
        applySampleView(nv, preview.type === 'local' ? 'mri' : 'overlay', preview.type !== 'local');
        setViewerStatus('ready');
      } catch {
        if (active) {
          setError('Unable to display MRI volume. Verify the selected NIfTI files.');
          setViewerStatus('error');
        }
      }
    };
    load();
    return () => {
      active = false;
      if (niivueRef.current === nv) niivueRef.current = null;
      nv.cleanup();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [preview, isSample]);

  useEffect(() => {
    if (viewerStatus === 'ready' && preview && niivueRef.current) {
      applySampleView(niivueRef.current, viewMode, hasMask);
    }
  }, [viewMode, viewerStatus, preview, hasMask]);

  const chooseSource = next => {
    inferenceSequenceRef.current += 1;
    setRunning(false);
    setSource(next);
    setPreview(null);
    setInferenceResult(null);
    setRecordedStudy(null);
    setViewerStatus('idle');
    setViewMode(next === 'sample' ? 'overlay' : 'mri');
    setError('');
  };

  const chooseFolder = fileList => {
    inferenceSequenceRef.current += 1;
    setRunning(false);
    const selected = resolveBraTSFolder(fileList);
    setFolder(selected);
    setInferenceResult(null);
    setRecordedStudy(null);
    setPreview(null);
    setViewerStatus('idle');
    setError('');
  };

  const showSample = () => {
    setViewMode('overlay');
    setInferenceResult(null);
    setError('');
    setPreview({ type: 'sample', nonce: Date.now() });
  };

  const showFolder = () => {
    if (folder.error || !folder.files.t1ce) return;
    setViewMode('mri');
    setError('');
    setPreview({ type: 'local', files: folder.files });
  };

  const canRecordStudy = Boolean(org) && (org.role == null || org.role === 'ADMIN');

  const recordStudy = async () => {
    if (!complete || recording || recordedStudy || !canRecordStudy) return;
    const sequence = inferenceSequenceRef.current;
    setRecording(true);
    setError('');
    try {
      const study = await recordImagingStudy(workspaceId, patient.id, folder.files);
      if (sequence === inferenceSequenceRef.current) setRecordedStudy(study);
    } catch (requestError) {
      if (sequence === inferenceSequenceRef.current) {
        const details = requestError.response?.data;
        const fieldError = ['t1', 't1ce', 't2', 'flair']
          .map(key => details?.[key]?.[0])
          .find(Boolean);
        setError(fieldError || details?.detail || 'Could not validate and record this study.');
      }
    } finally {
      setRecording(false);
    }
  };

  const runAI = async () => {
    if (!complete || !modelId || running || recording) return;
    const sequence = ++inferenceSequenceRef.current;
    setRunning(true);
    setError('');
    setInferenceResult(null);
    try {
      const response = await runSegmentation(workspaceId, patient.id, folder.files, modelId);
      if (sequence !== inferenceSequenceRef.current) return;
      const encoded = response?.result?.mask_nifti_base64;
      if (!encoded) throw new Error('Model response did not contain a segmentation mask.');
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      if (!bytes.length) throw new Error('Model returned an empty segmentation mask.');
      const mask = new Blob([bytes], { type: 'application/octet-stream' });
      setInferenceResult({ model: response.model, measurements: response.result.region_volumes_cm3 || null });
      setViewMode('overlay');
      setPreview({ type: 'predicted', files: folder.files, mask });
    } catch (requestError) {
      if (sequence !== inferenceSequenceRef.current) return;
      setError(requestError.response?.data?.detail || requestError.message || 'AI segmentation failed. No model result was generated.');
    } finally {
      if (sequence === inferenceSequenceRef.current) setRunning(false);
    }
  };

  const modes = hasMask
    ? SAMPLE_VIEWS
    : SAMPLE_VIEWS.filter(option => option.id === 'mri' || option.id === 'render');
  const complete = folder.folderName && !folder.error && MRI_MODALITIES.every(({ id }) => folder.files[id]);

  return (
    <>
      <div className="seg-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>3D Segmentation Workspace</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {patient.patient_code} · {source === 'sample' ? 'BraTS 2021 reference sample' : 'BraTS MRI folder · patient-scoped inference'}
          </div>
        </div>
        <span className="sample-availability"><FlaskConical size={14} /> Research workflow</span>
      </div>
      <div className="seg-workspace">
        <div className="seg-panel">
          <div className="seg-panel-header"><FolderOpen size={13} /> Input</div>
          <div className="seg-panel-body">
            <fieldset className="seg-source-picker">
              <legend className="field-label">Data source</legend>
              <label className={`seg-source-option ${source === 'sample' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" disabled={recording} checked={source === 'sample'} onChange={() => chooseSource('sample')} />
                Built-in BraTS sample
              </label>
              <label className={`seg-source-option ${source === 'folder' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" disabled={recording} checked={source === 'folder'} onChange={() => chooseSource('folder')} />
                Select BraTS MRI folder
              </label>
            </fieldset>
            {source === 'sample' ? (
              <>
                <div className="sample-data-note" role="note">
                  Reference MRI and dataset annotation only. No AI inference or patient-specific prediction.
                </div>
                <button className="run-seg-btn" type="button" onClick={showSample}><ScanLine size={14} /> Open 3D reference sample</button>
              </>
            ) : (
              <>
                <div className="seg-instructions">
                  <strong>Prepare your MRI input folder</strong>
                  <ol>
                    <li>Inside your local <code>input/files</code> directory, create a folder named <code>BraTS</code> (<code>input/files/BraTS</code>).</li>
                    <li>Place the four NIfTI files inside: <code>*_t1.nii.gz</code>, <code>*_t1ce.nii.gz</code>, <code>*_t2.nii.gz</code>, <code>*_flair.nii.gz</code>.</li>
                    <li>Select the <code>BraTS</code> folder itself below (not individual files). The app extracts and checks T1, T1CE, T2 and FLAIR automatically; no filesystem path needs to be typed.</li>
                  </ol>
                </div>
                <label className="field-label" htmlFor="brats-folder">BraTS input folder</label>
                <input
                  id="brats-folder"
                  className="seg-file-input"
                  type="file"
                  multiple
                  webkitdirectory=""
                  directory=""
                  disabled={recording}
                  onChange={event => chooseFolder(event.target.files)}
                />
                {folder.error && <p className="seg-file-error" role="alert">{folder.error}</p>}
                {folder.folderName && <div className="seg-folder-name">Selected folder: <strong>{folder.folderName}</strong></div>}
                <div className="seg-modalities" aria-label="Required MRI modalities">
                  {MRI_MODALITIES.map(modality => (
                    <div className="seg-file-row" key={modality.id}>
                      <span className="field-label">{modality.label}</span>
                      <span className="seg-file-info">{folder.files[modality.id]
                        ? `${folder.files[modality.id].name} · ${formatFileSize(folder.files[modality.id].size)}`
                        : 'Required · not found'}</span>
                      {folder.files[modality.id] && !folder.error && <CheckCircle2 size={13} aria-label="Found" />}
                    </div>
                  ))}
                </div>
                <button className="run-seg-btn" type="button" disabled={!complete || running} onClick={showFolder}>
                  <Brain size={14} /> Preview selected MRI
                </button>
                {canRecordStudy && (
                  <button className="run-seg-btn" type="button"
                    disabled={!complete || recording || Boolean(recordedStudy)} onClick={recordStudy}>
                    {recording ? 'Validating MRI upload…' : recordedStudy ? 'Study metadata recorded' : 'Record imaging study metadata'}
                  </button>
                )}
                {recordedStudy && (
                  <p className="seg-service-note" role="status">
                    Study recorded. MRI files were validated but not stored.{' '}
                    <Link to={`/patients/${patient.id}/imaging-studies`}>View imaging studies</Link>
                  </p>
                )}
                <p className="seg-service-note">
                  Recording a study sends the four volumes for basic server-side filename and size validation.
                  Only file sizes and timestamp are retained; MRI bytes and filenames are not saved.
                </p>
                <div className="field-row" style={{ marginTop: 14 }}>
                  <label className="field-label" htmlFor="seg-model">AI segmentation model</label>
                  <select id="seg-model" className="field-input" value={modelId}
                    onChange={e => setModelId(e.target.value)} disabled={running || !models.length}>
                    {models.length ? models.map(model => (
                      <option key={model.id} value={model.id}>{model.name} · {model.version}</option>
                    )) : <option value="">Not available</option>}
                  </select>
                </div>
                <button className="run-seg-btn" type="button"
                  disabled={!complete || !modelId || running || recording} onClick={runAI}>
                  {running ? <><Loader size={14} className="spin" /> Running segmentation…</> : <><ScanLine size={14} /> Run AI Segmentation</>}
                </button>
                {catalogError && <p className="seg-service-note" role="status">{catalogError}</p>}
                <div className="seg-inference-note" role="note">
                  <AlertTriangle size={15} />
                  <span>Segmentation runs only when the configured MONAI service supports authenticated MRI file uploads. The existing legacy Flask model API does not yet support this contract. No result is simulated.</span>
                </div>
              </>
            )}
            {error && <p className="seg-file-error" role="alert">{error}</p>}
          </div>
        </div>
        <div className="seg-panel" style={{ position: 'relative' }}>
          <div className="seg-panel-header"><Brain size={13} /> MRI and Segmentation Renderer</div>
          <div className="viewer-area">
            {!preview && <div className="viewer-placeholder">
              <Brain size={46} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <div>No MRI loaded</div>
              <div className="viewer-placeholder-detail">Choose the BraTS sample or a prepared BraTS input folder.</div>
            </div>}
            {preview && <>
              <canvas ref={canvasRef} aria-label="Interactive MRI and segmentation renderer" style={{ width: '100%', height: '100%', display: 'block' }} />
              {viewerStatus === 'loading' && <div className="viewer-loading">Loading NIfTI volumes…</div>}
              {viewerStatus === 'error' && <div className="viewer-placeholder viewer-error" role="alert"><AlertTriangle size={25} /> Could not render the selected MRI.</div>}
              {viewerStatus === 'ready' && <>
                <div className="viewer-toolbar" role="group" aria-label="MRI visualization modes">
                  {modes.map(mode => (
                    <button type="button" key={mode.id} className={`viewer-mode-btn ${viewMode === mode.id ? 'active' : ''}`}
                      onClick={() => setViewMode(mode.id)} aria-pressed={viewMode === mode.id}>{mode.label}</button>
                  ))}
                </div>
                <div className="viewer-model-note">
                  <CheckCircle2 size={11} /> {isSample ? 'Reference annotation · no model inference' : preview.type === 'predicted' ? 'AI-generated mask · experimental research' : 'MRI input only · no predicted mask'}
                </div>
              </>}
            </>}
          </div>
        </div>
        <div className="seg-panel">
          <div className="seg-panel-header"><FileOutput size={13} /> Output</div>
          <div className="seg-panel-body">
            {isSample ? <>
              <div className="sample-data-note" role="note">This mask comes from the BraTS reference dataset, not AI inference.</div>
              <div className="stat-row"><span className="stat-key">Input</span><span className="stat-val">Sample T1CE</span></div>
              <div className="stat-row"><span className="stat-key">Mask</span><span className="stat-val">Reference annotation</span></div>
              <div className="stat-row"><span className="stat-key">Illustrative volume</span><span className="stat-val">{SAMPLE_SEGMENTATION.volume_cm3} cm³</span></div>
              <p className="seg-service-note">Reference mask is displayed in the renderer only. It is not offered as a downloadable file.</p>
            </> : <>
              <div className="stat-row"><span className="stat-key">Input status</span><span className="stat-val">{complete ? '4 / 4 ready' : 'Awaiting BraTS folder'}</span></div>
              <div className="stat-row"><span className="stat-key">Segmentation output</span>
                <span className="stat-val">{inferenceResult ? 'Generated · visible in renderer' : 'Not generated'}</span>
              </div>
              {inferenceResult && <div className="stat-row"><span className="stat-key">Model version</span>
                <span className="stat-val">{inferenceResult.model.version}</span>
              </div>}
              {inferenceResult?.measurements && Object.entries(inferenceResult.measurements).map(([region, volume]) => (
                <div className="stat-row" key={region}>
                  <span className="stat-key">{region.replaceAll('_', ' ')}</span>
                  <span className="stat-val">{volume} cm³</span>
                </div>
              ))}
              {inferenceResult && (
                <Link
                  className="run-seg-btn"
                  to={`/patients/${patient.id}/reports`}
                  state={{
                    segmentationReport: {
                      patient_id: patient.id,
                      source: 'ai-inference',
                      model: inferenceResult.model,
                      measurements: inferenceResult.measurements,
                      modality_count: MRI_MODALITIES.length,
                    },
                  }}
                  style={{ display: 'inline-flex', textDecoration: 'none', marginTop: 12 }}
                >
                  <FileOutput size={14} /> View research report summary
                </Link>
              )}
              <p className="seg-service-note">Predicted masks appear in the renderer only. The report page can preview model metadata and measured volumes for this browser session; no mask download or saved report is provided.</p>
            </>}
          </div>
        </div>
      </div>
    </>
  );
}
