import test from 'node:test';
import assert from 'node:assert/strict';

import { startReferenceViewer, selectReferenceView } from './sample-viewer.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

function mockViewer() {
  const calls = [];
  const viewer = {
    volumes: [],
    sliceTypeRender: 4,
    sliceTypeMultiplanar: 3,
    async attachToCanvas() { calls.push('attach'); },
    async loadVolumes(volumes) {
      calls.push('load');
      viewer.volumes = volumes;
    },
    setOpacity(index, value) { calls.push(['opacity', index, value]); },
    setSliceType(mode) { calls.push(['slice', mode]); },
    drawScene() { calls.push('draw'); },
    cleanup() { calls.push('cleanup'); },
  };
  return { viewer, calls };
}

const volumes = [{ url: '/mri.nii.gz' }, { url: '/seg.nii.gz' }];

test('loading reference MRI and mask publishes ready 3D mode once', async () => {
  const { viewer, calls } = mockViewer();
  const ready = [];
  const errors = [];
  const ctrl = startReferenceViewer({
    viewer, canvas: {}, volumes, onReady: mode => ready.push(mode), onError: error => errors.push(error),
  });
  await ctrl.done;
  assert.deepEqual(ready, ['render']);
  assert.deepEqual(errors, []);
  assert.deepEqual(viewer.volumes, volumes);
  assert.ok(calls.includes('draw'));
  ctrl.dispose();
  ctrl.dispose();
  assert.equal(calls.filter(x => x === 'cleanup').length, 1);
});

test('unmount during canvas attachment prevents late load and cleans up afterwards', async () => {
  const attached = deferred();
  const { viewer, calls } = mockViewer();
  viewer.attachToCanvas = () => attached.promise;
  const events = [];
  const ctrl = startReferenceViewer({
    viewer, canvas: {}, volumes, onReady: () => events.push('ready'), onError: () => events.push('error'),
  });
  ctrl.dispose();
  attached.resolve();
  await ctrl.done;
  assert.deepEqual(events, []);
  assert.ok(!calls.includes('load'));
  assert.equal(calls.filter(x => x === 'cleanup').length, 1);
});

test('unmount during slow NIfTI download does not set ready or error', async () => {
  const download = deferred();
  const { viewer, calls } = mockViewer();
  viewer.loadVolumes = () => download.promise;
  const events = [];
  const ctrl = startReferenceViewer({
    viewer, canvas: {}, volumes, onReady: () => events.push('ready'), onError: () => events.push('error'),
  });
  await Promise.resolve();
  ctrl.dispose();
  download.reject(new Error('stale download'));
  await ctrl.done;
  assert.deepEqual(events, []);
  assert.equal(calls.filter(x => x === 'cleanup').length, 1);
});

test('a missing reference mask fails instead of presenting an MRI-only result', async () => {
  const { viewer } = mockViewer();
  viewer.loadVolumes = async ([mri]) => { viewer.volumes = [mri]; };
  const errors = [];
  const ctrl = startReferenceViewer({
    viewer, canvas: {}, volumes, onReady: () => assert.fail('should not become ready'),
    onError: error => errors.push(error.message),
  });
  await ctrl.done;
  assert.match(errors[0], /MRI and reference segmentation mask/);
  ctrl.dispose();
});

test('failed 3D renderer falls back to usable MRI and mask overlay', async () => {
  const { viewer } = mockViewer();
  viewer.setSliceType = mode => {
    if (mode === viewer.sliceTypeRender) throw new Error('No 3D support');
  };
  const ready = [];
  const ctrl = startReferenceViewer({
    viewer, canvas: {}, volumes, onReady: mode => ready.push(mode), onError: () => assert.fail('unexpected error'),
  });
  await ctrl.done;
  assert.deepEqual(ready, ['overlay']);
  ctrl.dispose();
});


test('switching back to unavailable 3D rendering falls back without crashing', () => {
  const { viewer } = mockViewer();
  viewer.setSliceType = mode => {
    if (mode === viewer.sliceTypeRender) throw new Error('WebGL 3D lost');
  };
  assert.equal(selectReferenceView(viewer, 'render'), 'overlay');
  assert.equal(selectReferenceView(viewer, 'mri'), 'mri');
});
