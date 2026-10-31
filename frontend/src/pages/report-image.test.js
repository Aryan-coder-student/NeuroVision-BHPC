import test from 'node:test';
import assert from 'node:assert/strict';
import { captureViewerPng } from './report-image.js';

test('captures a PNG of an existing rendered scene', async () => {
  const events = [];
  const png = new Blob(['png'], { type: 'image/png' });
  const canvas = {
    width: 800, height: 600,
    toBlob: (callback, mime) => { events.push(mime); callback(png); },
  };
  const result = await captureViewerPng(canvas, { drawScene: () => events.push('render') });
  assert.equal(result, png);
  assert.deepEqual(events, ['render', 'image/png']);
});

test('does not create empty reports when capture fails', async () => {
  await assert.rejects(captureViewerPng(null, null), /Open a 3D/);
  await assert.rejects(captureViewerPng({
    width: 100, height: 100, toBlob: callback => callback(null),
  }, { drawScene: () => {} }), /Could not capture/);
});
