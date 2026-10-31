export const MRI_MODALITIES = Object.freeze([
  { id: 't1', label: 'T1 MRI' },
  { id: 't1ce', label: 'T1CE MRI (contrast)' },
  { id: 't2', label: 'T2 MRI' },
  { id: 'flair', label: 'FLAIR MRI' },
]);

export const MAX_PREVIEW_FILE_BYTES = 200 * 1024 * 1024;

export function isNiftiFile(file) {
  return Boolean(file && typeof file.name === 'string' && /\.nii(\.gz)?$/i.test(file.name));
}

export function getNiftiFileError(file) {
  if (!file) return '';
  if (!isNiftiFile(file)) return 'Choose a .nii or .nii.gz file.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_PREVIEW_FILE_BYTES) return 'File exceeds the 200 MB browser preview limit.';
  return '';
}

export function formatFileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hasPreviewInput(files) {
  return MRI_MODALITIES.some(({ id }) => files[id] && !getNiftiFileError(files[id]));
}

export function hasAllModalities(files) {
  return MRI_MODALITIES.every(({ id }) => files[id] && !getNiftiFileError(files[id]));
}
