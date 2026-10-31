import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBraTSFolder, getNiftiFileError, MRI_MODALITIES,
  MAX_MRI_FILE_BYTES, REQUIRED_FOLDER_NAME,
} from './segmentation-files.js';

const file = (name, path = `BraTS/${name}`, size = 1024) => ({
  name, webkitRelativePath: path, size,
});
const braTSFiles = () => MRI_MODALITIES.map(({ id }) => file(`BraTS2021_00000_${id}.nii.gz`));

test('selecting one BraTS folder extracts T1, T1CE, T2 and FLAIR', () => {
  const result = resolveBraTSFolder([...braTSFiles(), file('README.txt'), file('BraTS2021_00000_seg.nii.gz')]);
  assert.equal(result.error, '');
  assert.equal(result.folderName, REQUIRED_FOLDER_NAME);
  assert.deepEqual(Object.keys(result.files).sort(), ['flair', 't1', 't1ce', 't2']);
});

test('rejects arbitrary folder names, nested folders and absent modalities', () => {
  assert.match(resolveBraTSFolder([file('scan_t1.nii.gz', 'Other/scan_t1.nii.gz')]).error, /Rename/);
  assert.match(resolveBraTSFolder([file('scan_t1.nii.gz', 'BraTS/sub/scan_t1.nii.gz')]).error, /directly/);
  assert.match(resolveBraTSFolder(braTSFiles().slice(1)).error, /T1/);
});

test('rejects duplicate, empty or oversized modality inputs', () => {
  const dup = [...braTSFiles(), file('another_t1.nii.gz')];
  assert.match(resolveBraTSFolder(dup).error, /Multiple/);
  const empty = [...braTSFiles()]; empty[0] = file('scan_t1.nii.gz', 'BraTS/scan_t1.nii.gz', 0);
  assert.match(resolveBraTSFolder(empty).error, /empty/);
  const huge = [...braTSFiles()]; huge[0] = file('scan_t1.nii.gz', 'BraTS/scan_t1.nii.gz', MAX_MRI_FILE_BYTES + 1);
  assert.match(resolveBraTSFolder(huge).error, /32 MB/);
  assert.match(getNiftiFileError(file('notes.txt')), /nii/);
});

test('prevents confusing folder selection with a file path', () => {
  const files = braTSFiles().map(({name, size}) => ({ name, size, webkitRelativePath: '' }));
  assert.match(resolveBraTSFolder(files).error, /entire folder/);
});

test('rejects modalities combined from different BraTS studies', () => {
  const mixed = braTSFiles();
  mixed[2] = file('BraTS2021_00001_t2.nii.gz');
  assert.match(resolveBraTSFolder(mixed).error, /different study/);
});
