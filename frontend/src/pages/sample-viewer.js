import { applySampleView } from './segmentation-demo.js';

/**
 * Drive a single NiiVue mount without leaking listeners or publishing stale
 * results when React StrictMode, navigation, or Retry unmounts the viewer
 * before the asynchronous MRI/annotation load finishes.
 *
 * Cleanup waits for the outstanding NiiVue startup/load promise to settle:
 * an attach still in progress may register observers after an early cleanup.
 * React remounts the canvas on Retry to avoid stale WebGL context state.
 */
export function selectReferenceView(viewer, requested) {
  try {
    applySampleView(viewer, requested, true);
    return requested;
  } catch (error) {
    if (requested !== 'render') throw error;
    // The WebGL 3D pipeline can fail independently of regular 2D volume display.
    applySampleView(viewer, 'overlay', true);
    return 'overlay';
  }
}

export function startReferenceViewer({ viewer, canvas, volumes, onReady, onError }) {
  let active = true;
  let finished = false;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    viewer.cleanup();
  };

  const done = (async () => {
    try {
      await viewer.attachToCanvas(canvas);
      if (!active) return;

      await viewer.loadVolumes(volumes.map(volume => ({ ...volume })));
      if (!active) return;
      if (!viewer.volumes || viewer.volumes.length !== volumes.length) {
        throw new Error('Both the BraTS MRI and reference segmentation mask are required.');
      }

      const mode = selectReferenceView(viewer, 'render');
      if (active) onReady(mode);
    } catch (error) {
      if (active) onError(error);
    } finally {
      finished = true;
      if (!active) cleanup();
    }
  })();

  return {
    done,
    dispose() {
      active = false;
      if (finished) cleanup();
    },
  };
}
