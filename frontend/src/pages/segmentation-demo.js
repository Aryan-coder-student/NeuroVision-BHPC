// Explicit, non-clinical demo assets. These are bundled reference annotations,
// not output from the patient inference API.
export const SAMPLE_SEGMENTATION = Object.freeze({
  source: 'sample',
  tumor_type: 'BraTS tumor regions',
  grade: 'Reference annotation (not AI-generated)',
  volume_cm3: 57.3,
  surface_area: null,
  location: 'De-identified research volume',
  confidence: null,
  processing_s: null,
  model_version: 'BraTS 2021 reference mask',
});

export const SAMPLE_VOLUMES = Object.freeze([
  { url: '/data/BraTS2021_00000/BraTS2021_00000_t1ce.nii.gz', colormap: 'gray' },
  { url: '/data/BraTS2021_00000/BraTS2021_00000_seg.nii.gz', colormap: 'red', opacity: 0.55 },
]);

export const SAMPLE_VIEWS = Object.freeze([
  { id: 'overlay', label: 'MRI + mask' },
  { id: 'mri', label: 'Original MRI' },
  { id: 'mask', label: 'Segmentation mask' },
  { id: 'render', label: '3D overlay' },
]);

const VIEW_SETTINGS = Object.freeze({
  overlay: { mri: 1, mask: 0.55, render: false },
  mri: { mri: 1, mask: 0, render: false },
  mask: { mri: 0, mask: 1, render: false },
  render: { mri: 1, mask: 0.55, render: true },
});

/** Switch views without downloading the same NIfTI volumes again. */
export function applySampleView(nv, view, hasMask = true) {
  const settings = VIEW_SETTINGS[view] || VIEW_SETTINGS.overlay;
  nv.setOpacity(0, settings.mri);
  if (hasMask) nv.setOpacity(1, settings.mask);
  nv.setSliceType(settings.render ? nv.sliceTypeRender : nv.sliceTypeMultiplanar);
  nv.drawScene();
}
