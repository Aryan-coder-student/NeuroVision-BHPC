import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MRI_MODALITIES, isNiftiFile, getNiftiFileError, hasPreviewInput,
  hasAllModalities, MAX_PREVIEW_FILE_BYTES,
} from './segmentation-files.js';

const file = (name, size = 1024) => ({ name, size });

test('MRI selection accepts only .nii or .nii.gz and bounds file size', () => {
  assert.equal(isNiftiFile(file('scan.nii.gz')), true);
  assert.equal(isNiftiFile(file('scan.NII')), true);
  assert.equal(isNiftiFile(file('scan.nii.gz.exe')), false);
  assert.match(getNiftiFileError(file('scan.zip')), /nii/);
  assert.match(getNiftiFileError(file('scan.nii', 0)), /empty/);
  assert.match(getNiftiFileError(file('scan.nii.gz', MAX_PREVIEW_FILE_BYTES + 1)), /200 MB/);
});

test('preview requires any valid MRI; inference input requires all four modalities', () => {
  const files = Object.fromEntries(MRI_MODALITIES.map(({ id }) => [id, file(`sample_${id}.nii.gz`)]));
  assert.equal(hasPreviewInput({}), false);
  assert.equal(hasPreviewInput({ t1ce: files.t1ce }), true);
  assert.equal(hasAllModalities({ t1ce: files.t1ce }), false);
  assert.equal(hasAllModalities(files), true);
  assert.equal(hasAllModalities({ ...files, t1: file('bad.txt') }), false);
});
