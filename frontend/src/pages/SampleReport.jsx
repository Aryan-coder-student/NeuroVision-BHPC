import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Niivue } from '@niivue/niivue';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

import { SAMPLE_VIEWS } from './segmentation-demo';
import { startReferenceViewer, selectReferenceView } from './sample-viewer';
import { BRATS_SAMPLE_REPORT } from './sample-report';
import './SampleReport.css';

const FACTS = [
  ['Dataset', BRATS_SAMPLE_REPORT.dataset],
  ['Reference scan', BRATS_SAMPLE_REPORT.caseId],
  ['MRI sequence', BRATS_SAMPLE_REPORT.mriModality],
  ['Segmentation', BRATS_SAMPLE_REPORT.annotation],
  ['Inference model', 'Not used — ground-truth/reference mask'],
  ['Tumor measurements', 'Not calculated'],
  ['Patient association', 'None — sample dataset only'],
];

export default function SampleReport({ patientId }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [viewMode, setViewMode] = useState('render');
  const [renderSupported, setRenderSupported] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const nv = new Niivue({
      backColor: [0.023, 0.055, 0.125, 1],
      dragAndDropEnabled: false,
    });
    viewerRef.current = nv;
    const controller = startReferenceViewer({
      viewer: nv,
      canvas: canvasRef.current,
      volumes: BRATS_SAMPLE_REPORT.volumes,
      onReady: initialMode => {
        setViewMode(initialMode);
        setRenderSupported(initialMode === 'render');
        setStatus('ready');
      },
      onError: () => setStatus('error'),
    });

    return () => {
      if (viewerRef.current === nv) viewerRef.current = null;
      controller.dispose();
    };
  }, [retry]);

  const changeView = mode => {
    if (status !== 'ready' || !viewerRef.current) return;
    try {
      const applied = selectReferenceView(viewerRef.current, mode.id);
      setViewMode(applied);
      if (mode.id === 'render' && applied !== 'render') {
        setRenderSupported(false);
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <article className="brats-report" aria-labelledby="brats-report-title">
      <div className="brats-report-top">
        <div>
          <h2 id="brats-report-title">{BRATS_SAMPLE_REPORT.title}</h2>
          <p>Sample research report · {BRATS_SAMPLE_REPORT.caseId}</p>
        </div>
        <span className="brats-reference-tag"><CheckCircle2 size={14} /> Reference annotation</span>
      </div>
      <div className="brats-report-disclaimer" role="note">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>{BRATS_SAMPLE_REPORT.disclaimer} No backend AI inference has been performed, and no clinical conclusions can be drawn from this preview.</span>
      </div>
      <div className="brats-report-layout">
        <section aria-label="BraTS reference MRI 3D viewer" className="brats-report-visual">
          <div className="brats-report-canvas">
            <canvas
              key={retry}
              ref={canvasRef}
              aria-label="Interactive 3D render of the bundled BraTS reference MRI and segmentation mask"
            />
            {status === 'loading' && (
              <div className="brats-report-state" role="status">Loading BraTS reference MRI and segmentation mask…</div>
            )}
            {status === 'error' && (
              <div className="brats-report-state" role="alert">
                <AlertTriangle size={22} />
                <span>Could not load the bundled sample MRI or segmentation mask.</span>
                <button type="button" onClick={() => {
                  setStatus('loading');
                  setRenderSupported(true);
                  setRetry(n => n + 1);
                }}>
                  <RotateCcw size={14} /> Retry viewer
                </button>
              </div>
            )}
          </div>
          <div className="brats-report-toolbar" role="group" aria-label="Reference MRI visualization modes">
            {SAMPLE_VIEWS.map(mode => (
              <button type="button" key={mode.id} disabled={status !== 'ready' || (mode.id === 'render' && !renderSupported)}
                aria-pressed={viewMode === mode.id}
                className={viewMode === mode.id ? 'selected' : ''}
                onClick={() => changeView(mode)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {!renderSupported && (
            <p className="brats-report-hint" role="status">
              3D rendering is unavailable in this browser. MRI and reference mask remain available in 2D.
            </p>
          )}
          <p className="brats-report-hint">
            The viewer loads the project's bundled T1CE NIfTI volume and corresponding reference mask.
            It does not display a fabricated AI prediction.
          </p>
        </section>
        <section aria-label="Reference report details" className="brats-report-metadata">
          <h3>Reference dataset details</h3>
          <dl>
            {FACTS.map(([name, value]) => (
              <div className="brats-report-field" key={name}>
                <dt>{name}</dt><dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>This is a read-only preview. It is not saved to PostgreSQL, the Hugging Face bucket, or patient history.</p>
          <Link className="brats-report-navigation" to={`/patients/${patientId}/segmentation`}>
            Open 3D segmentation workspace
          </Link>
        </section>
      </div>
    </article>
  );
}
