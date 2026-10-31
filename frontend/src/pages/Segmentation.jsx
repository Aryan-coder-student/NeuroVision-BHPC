import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Niivue } from '@niivue/niivue';
import {
  AlertTriangle, Brain, CheckCircle2, FileOutput, FlaskConical, FolderOpen, ScanLine,
} from 'lucide-react';
import {
  SAMPLE_SEGMENTATION, SAMPLE_VOLUMES, SAMPLE_VIEWS, applySampleView,
} from './segmentation-demo';
import { MRI_MODALITIES, resolveBraTSFolder, formatFileSize } from './segmentation-files';
import './Segmentation.css';

export default function Segmentation() {
  const { patient } = useOutletContext();
  const [source, setSource] = useState('sample');
  const [folder, setFolder] = useState({ files: {}, error: '', folderName: '' });
  const [preview, setPreview] = useState(null);
  const [viewMode, setViewMode] = useState('overlay');
  const [viewerStatus, setViewerStatus] = useState('idle');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const isSample = preview?.type === 'sample';
  const hasMask = isSample;

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
        }
        await nv.loadVolumes(volumes);
        if (!active) return;
        applySampleView(nv, isSample ? 'overlay' : 'mri', isSample);
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
    setSource(next);
    setPreview(null);
    setViewerStatus('idle');
    setViewMode(next === 'sample' ? 'overlay' : 'mri');
    setError('');
  };

  const chooseFolder = fileList => {
    const selected = resolveBraTSFolder(fileList);
    setFolder(selected);
    setPreview(null);
    setViewerStatus('idle');
    setError('');
  };

  const showSample = () => {
    setViewMode('overlay');
    setError('');
    setPreview({ type: 'sample', nonce: Date.now() });
  };

  const showFolder = () => {
    if (folder.error || !folder.files.t1ce) return;
    setViewMode('mri');
    setError('');
    setPreview({ type: 'local', files: folder.files });
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
            {patient.patient_code} · {source === 'sample' ? 'BraTS 2021 reference sample' : 'BraTS input folder · local preview'}
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
                <input type="radio" name="segmentation-source" checked={source === 'sample'} onChange={() => chooseSource('sample')} />
                Built-in BraTS sample
              </label>
              <label className={`seg-source-option ${source === 'folder' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" checked={source === 'folder'} onChange={() => chooseSource('folder')} />
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
                    <li>Create a folder named <code>BraTS</code>.</li>
                    <li>Place the four NIfTI files inside: <code>*_t1.nii.gz</code>, <code>*_t1ce.nii.gz</code>, <code>*_t2.nii.gz</code>, <code>*_flair.nii.gz</code>.</li>
                    <li>Select the entire folder below; the app identifies all four modalities automatically.</li>
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
                <button className="run-seg-btn" type="button" disabled={!complete} onClick={showFolder}>
                  <Brain size={14} /> Preview selected MRI
                </button>
                <div className="seg-inference-note" role="note">
                  <AlertTriangle size={15} />
                  <span>The AI segmentation API is not connected to folder uploads yet. This PR previews the input safely; a generated segmentation mask will appear here only after an actual model run succeeds.</span>
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
                  <CheckCircle2 size={11} /> {isSample ? 'Reference annotation · no model inference' : 'MRI input only · no predicted mask'}
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
              <div className="stat-row"><span className="stat-key">Segmentation output</span><span className="stat-val">Not generated</span></div>
              <p className="seg-service-note">After a successful model run, the output mask will appear in the renderer and be available to the future report workflow. No direct mask download is offered.</p>
            </>}
          </div>
        </div>
      </div>
    </>
  );
}
