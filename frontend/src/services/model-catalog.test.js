import assert from 'node:assert/strict';
import test from 'node:test';

import { configuredModels, modelLabel } from './model-catalog.js';


test('configuredModels excludes unconfigured and unrelated providers', () => {
  const models = [
    { id: 'seg', capability: 'segmentation', is_configured: true },
    { id: 'disabled', capability: 'segmentation', is_configured: false },
    { id: 'vqa', capability: 'vqa', is_configured: true },
  ];

  assert.deepEqual(
    configuredModels(models, 'segmentation').map(model => model.id),
    ['seg'],
  );
});

test('modelLabel includes the catalog version', () => {
  assert.equal(
    modelLabel({ name: 'MONAI 3D UNet', version: '2.1' }),
    'MONAI 3D UNet · v2.1',
  );
});
