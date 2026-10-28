import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_SEGMENTATION, SAMPLE_VOLUMES, SAMPLE_VIEWS, applySampleView,
} from './segmentation-demo.js';

test('the demo uses the matching bundled BraTS MRI and annotation', () => {
  assert.equal(SAMPLE_SEGMENTATION.source, 'sample');
  assert.match(SAMPLE_SEGMENTATION.grade, /not AI-generated/);
  assert.match(SAMPLE_VOLUMES[0].url, /BraTS2021_00000_t1ce\.nii\.gz$/);
  assert.match(SAMPLE_VOLUMES[1].url, /BraTS2021_00000_seg\.nii\.gz$/);
  assert.deepEqual(SAMPLE_VIEWS.map(item => item.id), ['overlay', 'mri', 'mask', 'render']);
});

test('switching views updates MRI and mask opacity without reloading', () => {
  const calls = [];
  const nv = {
    sliceTypeRender: 4,
    sliceTypeMultiplanar: 3,
    setOpacity: (...args) => calls.push(['opacity', ...args]),
    setSliceType: value => calls.push(['slice', value]),
    drawScene: () => calls.push(['draw']),
  };
  applySampleView(nv, 'mri');
  assert.deepEqual(calls, [['opacity', 0, 1], ['opacity', 1, 0], ['slice', 3], ['draw']]);
  calls.length = 0;
  applySampleView(nv, 'mask');
  assert.deepEqual(calls, [['opacity', 0, 0], ['opacity', 1, 1], ['slice', 3], ['draw']]);
  calls.length = 0;
  applySampleView(nv, 'render');
  assert.deepEqual(calls, [['opacity', 0, 1], ['opacity', 1, 0.55], ['slice', 4], ['draw']]);
});
