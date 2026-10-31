import { SAMPLE_VOLUMES } from './segmentation-demo.js';

/** Static research reference — never a patient inference, diagnosis or saved record. */
export const BRATS_SAMPLE_REPORT = Object.freeze({
  id: 'brats2021_00000',
  source: 'sample_reference',
  title: 'BraTS 2021 — Reference Segmentation',
  dataset: 'BraTS 2021',
  caseId: 'BraTS2021_00000',
  mriModality: 'T1 contrast-enhanced (T1CE)',
  annotation: 'Reference segmentation mask',
  model: null,
  measurements: null,
  patientId: null,
  generatedAt: null,
  disclaimer: 'Research dataset sample — not an AI prediction, clinical result, or patient-specific report.',
  volumes: SAMPLE_VOLUMES,
});

export function isBratsSampleReport(sampleId) {
  return sampleId === BRATS_SAMPLE_REPORT.id;
}

export function sampleReportPath(patientId) {
  return `/patients/${encodeURIComponent(patientId)}/reports?sample=${BRATS_SAMPLE_REPORT.id}`;
}
