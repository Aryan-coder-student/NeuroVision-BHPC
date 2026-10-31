import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Niivue } from '@niivue/niivue';
import {
  AlertTriangle, Brain, CheckCircle2, Download, FileOutput,
  FlaskConical, ScanLine, UploadCloud,
} from 'lucide-react';
import {
  SAMPLE_SEGMENTATION, SAMPLE_VOLUMES, SAMPLE_VIEWS, applySampleView,
} from './segmentation-demo';
import {
  MRI_MODALITIES, getNiftiFileError, hasAllModalities,
  hasPreviewInput, formatFileSize,
} from './segmentation-files';
import './Segmentation.css';

export default function Segmentation() {
  const { patient } = useOutletContext();
  const [source, setSource] = useState('sample');
  const [files, setFiles] = useState({});
  const [maskFile, setMaskFile] = useState(null);
  const [selectedModality, setSelectedModality] = useState('t1ce');
  const [preview, setPreview] = useState(null);
  const [viewMode, setViewMode] = useState('overlay');
  const [viewerStatus, setViewerStatus] = useState('idle');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);

  const sampleLoaded = preview?.type === 'sample';
  const isLocalPreview = preview?.type === 'files';
  const hasMask = sampleLoaded || Boolean(preview?.mask);
  const readyToPreview = hasPreviewInput(files);
  const allModalitiesPresent = hasAllModalities(files);

  useEffect(() => {
    if (!preview || !canvasRef.current) return undefined;
    let active = true;
    const objectUrls = [];
    const nv = new Niivue({
      backColor: [0.023, 0.055, 0.125, 1],
      dragAndDropEnabled: false,
    });
    niivueRef.current = nv;
    const loadViewer = async () => {
      setViewerStatus('loading');
      try {
        await nv.attachToCanvas(canvasRef.current);
        if (!active) return;
        let volumes;
        if (preview.type === 'sample') {
          volumes = SAMPLE_VOLUMES.map(volume => ({ ...volume }));
        } else {
          const selected = preview.files[preview.modality];
          const imageUrl = URL.createObjectURL(selected);
          objectUrls.push(imageUrl);
          volumes = [{ url: imageUrl, name: selected.name, colormap: 'gray' }];
          if (preview.mask) {
            const maskUrl = URL.createObjectURL(preview.mask);
            objectUrls.push(maskUrl);
            volumes.push({ url: maskUrl, name: preview.mask.name, colormap: 'red', opacity: 0.55 });
          }
        }
        await nv.loadVolumes(volumes);
        if (!active) return;
        applySampleView(nv, preview.mask || preview.type === 'sample' ? 'overlay' : 'mri', volumes.length > 1);
        setViewerStatus('ready');
      } catch {
        if (active) {
          setError('Could not load the selected NIfTI volumes. Check the files and their geometry.');
          setViewerStatus('error');
        }
      }
    };
    loadViewer();
    return () => {
      active = false;
      if (niivueRef.current === nv) niivueRef.current = null;
      nv.cleanup();
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [preview]);

  useEffect(() => {
    if (!preview || viewerStatus !== 'ready' || !niivueRef.current) return;
    applySampleView(niivueRef.current, viewMode, hasMask);
  }, [viewMode, viewerStatus, preview, hasMask]);

  const chooseSource = next => {
    setSource(next);
    setPreview(null);
    setViewerStatus('idle');
    setViewMode(next === 'sample' ? 'overlay' : 'mri');
    setError('');
  };

  const chooseFile = (id, file) => {
    setPreview(null);
    setViewerStatus('idle');
    setError('');
    if (id === 'mask') setMaskFile(file || null);
    else setFiles(current => ({ ...current, [id]: file || null }));
  };

  const openSample = () => {
    setError('');
    setViewMode('overlay');
    setPreview({ type: 'sample', nonce: Date.now() });
  };

  const openLocalPreview = () => {
    if (!readyToPreview) return;
    const requested = files[selectedModality] && !getNiftiFileError(files[selectedModality])
      ? selectedModality
      : MRI_MODALITIES.find(({ id }) => files[id] && !getNiftiFileError(files[id])).id;
    setError('');
    setViewMode(maskFile ? 'overlay' : 'mri');
    setPreview({ type: 'files', files: { ...files }, mask: !getNiftiFileError(maskFile) ? maskFile : null, modality: requested });
  };

  const downloadMask = () => {
    if (!maskFile || getNiftiFileError(maskFile)) return;
    const url = URL.createObjectURL(maskFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = maskFile.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const viewOptions = hasMask
    ? SAMPLE_VIEWS
    : SAMPLE_VIEWS.filter(option => option.id === 'mri' || option.id === 'render');

  return (
    <>
      <div className="seg-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
            3D Segmentation Workspace
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {patient.patient_code} · {source === 'sample' ? 'De-identified BraTS reference sample' : 'Local MRI inspection · not uploaded'}
          </div>
        </div>
        <span className="sample-availability"><FlaskConical size={14} /> Research workflow</span>
      </div>

      <div className="seg-workspace">
        <div className="seg-panel">
          <div className="seg-panel-header"><UploadCloud size={13} /> Input Files</div>
          <div className="seg-panel-body">
            <fieldset className="seg-source-picker">
              <legend className="field-label">Choose data source</legend>
              <label className={`seg-source-option ${source === 'sample' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" checked={source === 'sample'} onChange={() => chooseSource('sample')} />
                BraTS 2021 reference sample
              </label>
              <label className={`seg-source-option ${source === 'files' ? 'selected' : ''}`}>
                <input type="radio" name="segmentation-source" checked={source === 'files'} onChange={() => chooseSource('files')} />
                Select my MRI / mask files
              </label>
            </fieldset>
            {source === 'sample' ? (
              <>
                <div className="sample-data-note" role="note">
                  Load the bundled T1CE MRI and its BraTS reference mask for 2D slices or 3D overlay.
                  This is not an AI prediction and is not linked to the selected patient.
                </div>
                <button type="button" className="run-seg-btn" onClick={openSample}>
                  <ScanLine size={14} /> Open reference 3D sample
                </button>
              </>
            ) : (
              <>
                <p className="seg-service-note">
                  Choose NIfTI (.nii / .nii.gz) MRI scans from your device.
                  Files stay in this browser for preview; they are not uploaded or analyzed by AI.
                </p>
                {MRI_MODALITIES.map(modality => (
                  <div className="seg-file-row" key={modality.id}>
                    <label className="field-label" htmlFor={`mri-file-${modality.id}`}>{modality.label}</label>
                    <input
                      className="seg-file-input"
                      id={`mri-file-${modality.id}`}
                      type="file"
                      accept=".nii,.nii.gz"
                      onChange={event => chooseFile(modality.id, event.target.files?.[0])}
                    />
                    {files[modality.id] && (
                      <div className="seg-file-info">
                        {files[modality.id].name} · {formatFileSize(files[modality.id].size)}
                      </div>
                    )}
                    {getNiftiFileError(files[modality.id]) && (
                      <div className="seg-file-error" role="alert">{getNiftiFileError(files[modality.id])}</div>
                    )}
                  </div>
                ))}
                <div className="seg-file-row seg-file-output">
                  <label className="field-label" htmlFor="seg-output-mask">Output: Segmentation mask (optional)</label>
                  <input
                    className="seg-file-input" id="seg-output-mask" type="file" accept=".nii,.nii.gz"
                    onChange={event => chooseFile('mask', event.target.files?.[0])}
                  />
                  {maskFile && <div className="seg-file-info">{maskFile.name} · {formatFileSize(maskFile.size)}</div>}
                  {getNiftiFileError(maskFile) && (
                    <div className="seg-file-error" role="alert">{getNiftiFileError(maskFile)}</div>
                  )}
                  <p className="seg-service-note">Optional pre-existing mask for overlay; this UI does not generate a mask.</p>
                </div>
                <div className="field-row">
                  <label className="field-label" htmlFor="seg-preview-modality">MRI to preview</label>
                  <select id="seg-preview-modality" className="field-input" value={selectedModality} onChange={e => setSelectedModality(e.target.value)}>
                    {MRI_MODALITIES.map(modality => <option key={modality.id} value={modality.id}>{modality.label}</option>)}
                  </select>
                </div>
                <div className="seg-file-completeness">
                  <CheckCircle2 size={13} /> {allModalitiesPresent ? 'All four modalities selected' : 'Four modalities required for future model inference; one is sufficient to preview'}
                </div>
                <button type="button" className="run-seg-btn" onClick={openLocalPreview} disabled={!readyToPreview}>
                  <Brain size={14} /> Preview MRI {maskFile && !getNiftiFileError(maskFile) ? '+ mask' : ''}
                </button>
                <div className="seg-inference-note" role="note">
                  <AlertTriangle size={15} />
                  <span><strong>AI inference not connected yet.</strong> The existing model service accepts a server folder path, not browser uploads. No model run or report is produced here.</span>
                </div>
              </>
            )}
            {error && <p className="seg-file-error" role="alert">{error}</p>}
          </div>
        </div>

        <div className="seg-panel" style={{ position: 'relative' }}>
          <div className="seg-panel-header"><Brain size={13} /> MRI and Segmentation Viewer</div>
          <div className="viewer-area">
            {!preview && <div className="viewer-placeholder">
              <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <div>No imaging data loaded</div>
              <div className="viewer-placeholder-detail">Open the BraTS sample or preview your own NIfTI files.</div>
            </div>}
            {preview && <>
              <canvas ref={canvasRef} aria-label="Interactive MRI and segmentation preview" style={{ width: '100%', height: '100%', display: 'block' }} />
              {viewerStatus === 'loading' && <div className="viewer-loading">Loading MRI volumes…</div>}
              {viewerStatus === 'error' && <div className="viewer-placeholder viewer-error"><AlertTriangle size={25} /> Could not display NIfTI data.</div>}
              {viewerStatus === 'ready' && <>
                <div className="viewer-toolbar" role="group" aria-label="MRI preview controls">
                  {viewOptions.map(option => (
                    <button key={option.id} type="button" className={`viewer-mode-btn ${viewMode === option.id ? 'active' : ''}`}
                      onClick={() => setViewMode(option.id)} aria-pressed={viewMode === option.id}>{option.label}</button>
                  ))}
                </div>
                {sampleLoaded && <div className="viewer-result-badge">
                  <div className="viewer-result-label">Reference annotation · no AI inference</div>
                  <div className="viewer-result-title">{SAMPLE_SEGMENTATION.tumor_type}</div>
                </div>}
                {isLocalPreview && <div className="viewer-model-note"><CheckCircle2 size={11} /> Local browser preview · not a model prediction</div>}
              </>}
            </>}
          </div>
        </div>

        <div className="seg-panel">
          <div className="seg-panel-header"><FileOutput size={13} /> Output</div>
          <div className="seg-panel-body">
            {sampleLoaded ? (
              <>
                <div className="sample-data-note" role="note">
                  BraTS reference segmentation (ground-truth annotation), not a generated clinical finding.
                </div>
                <div className="stat-row"><span className="stat-key">MRI input</span><span className="stat-val">T1CE sample</span></div>
                <div className="stat-row"><span className="stat-key">Mask output</span><span className="stat-val">Reference</span></div>
                <div className="stat-row"><span className="stat-key">Sample volume (illustrative)</span><span className="stat-val">{SAMPLE_SEGMENTATION.volume_cm3} cm³</span></div>
                <a className="report-btn" href="/data/BraTS2021_00000/BraTS2021_00000_seg.nii.gz" download="BraTS2021_00000_reference_mask.nii.gz">
                  <Download size={14} /> Download reference mask
                </a>
              </>
            ) : source === 'files' ? (
              <>
                <div className="stat-row"><span className="stat-key">MRI files selected</span><span className="stat-val">{MRI_MODALITIES.filter(({ id }) => files[id] && !getNiftiFileError(files[id])).length} / 4</span></div>
                <div className="stat-row"><span className="stat-key">Output mask</span><span className="stat-val">{maskFile && !getNiftiFileError(maskFile) ? 'Provided by user' : 'Not available'}</span></div>
                <p className="seg-service-note">
                  A segmentation result will appear here after a file-upload-capable model API is integrated.
                  Uploaded masks shown here are user-supplied, not AI-generated.
                </p>
                {maskFile && !getNiftiFileError(maskFile) && <button className="report-btn" type="button" onClick={downloadMask}>
                  <Download size={14} /> Download selected mask
                </button>}
              </>
            ) : (
              <div className="sample-data-note">Open the reference sample to inspect the annotated output.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
