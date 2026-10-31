export const MRI_MODALITIES = Object.freeze([
  { id: 't1', label: 'T1' },
  { id: 't1ce', label: 'T1CE' },
  { id: 't2', label: 'T2' },
  { id: 'flair', label: 'FLAIR' },
]);

// Matches the preliminary Django multipart limit, not a clinical storage limit.
export const MAX_MRI_FILE_BYTES = 32 * 1024 * 1024;
export const REQUIRED_FOLDER_NAME = 'BraTS';

export function getNiftiFileError(file) {
  if (!file || !/\.nii(\.gz)?$/i.test(file.name)) return 'Only .nii / .nii.gz MRI volumes are supported.';
  if (file.size <= 0) return 'MRI volume is empty.';
  if (file.size > MAX_MRI_FILE_BYTES) return 'MRI volume exceeds the 32 MB experimental limit.';
  return '';
}

export function formatFileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function modalityForFilename(filename) {
  const filenameLower = filename.toLowerCase();
  return MRI_MODALITIES.find(({ id }) =>
    new RegExp(`(?:^|[_-])${id}\\.nii(?:\\.gz)?$`, 'i').test(filenameLower)
  )?.id ?? null;
}

/** Strictly map a single BraTS folder into four *distinct* MRI modalities. */
export function resolveBraTSFolder(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return { files: {}, error: '', folderName: '' };
  const paths = files.map(file => file.webkitRelativePath || '');
  if (paths.some(path => !path.includes('/'))) {
    return { files: {}, error: 'Choose the entire folder using “Select BraTS folder”.', folderName: '' };
  }
  const root = paths[0].split('/')[0];
  if (root.toLowerCase() !== REQUIRED_FOLDER_NAME.toLowerCase()) {
    return { files: {}, error: 'Rename your input folder to BraTS and select that folder.', folderName: root };
  }
  if (paths.some(path => path.split('/')[0] !== root || path.split('/').length !== 2)) {
    return { files: {}, error: 'Keep all four MRI files directly inside one BraTS folder, without subfolders.', folderName: root };
  }
  const byModality = {};
  for (const file of files) {
    const modality = modalityForFilename(file.name);
    if (!modality) continue; // Ignore README files and pre-existing annotations; never use them as inference input.
    const error = getNiftiFileError(file);
    if (error) return { files: {}, error: `${file.name}: ${error}`, folderName: root };
    if (byModality[modality]) {
      return { files: {}, error: `Multiple ${modality.toUpperCase()} MRI files found. Keep one per modality.`, folderName: root };
    }
    byModality[modality] = file;
  }
  const missing = MRI_MODALITIES.filter(({ id }) => !byModality[id]).map(({ label }) => label);
  if (missing.length) return { files: byModality, error: `Missing MRI volumes: ${missing.join(', ')}.`, folderName: root };
  return { files: byModality, error: '', folderName: root };
}
