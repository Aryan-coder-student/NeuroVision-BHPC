import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRATS_SAMPLE_REPORT,
  sampleReportPath,
  isBratsSampleReport,
} from './sample-report.js';
import { SAMPLE_VOLUMES } from './segmentation-demo.js';

test('the report is a bundled BraTS reference, not generated clinical inference', () => {
  assert.equal(BRATS_SAMPLE_REPORT.id, 'brats2021_00000');
  assert.equal(BRATS_SAMPLE_REPORT.source, 'sample_reference');
  assert.equal(BRATS_SAMPLE_REPORT.dataset, 'BraTS 2021');
  assert.equal(BRATS_SAMPLE_REPORT.caseId, 'BraTS2021_00000');
  assert.equal(BRATS_SAMPLE_REPORT.annotation, 'Reference segmentation mask');
  assert.equal(BRATS_SAMPLE_REPORT.model, null);
  assert.equal(BRATS_SAMPLE_REPORT.measurements, null);
  assert.equal(BRATS_SAMPLE_REPORT.patientId, null);
  assert.equal(BRATS_SAMPLE_REPORT.generatedAt, null);
  assert.match(BRATS_SAMPLE_REPORT.disclaimer, /not an AI prediction/i);
});

test('report uses the exact reference MRI and corresponding annotation already bundled', () => {
  assert.deepEqual(BRATS_SAMPLE_REPORT.volumes, SAMPLE_VOLUMES);
  assert.match(BRATS_SAMPLE_REPORT.volumes[0].url, /BraTS2021_00000_t1ce\.nii\.gz$/);
  assert.match(BRATS_SAMPLE_REPORT.volumes[1].url, /BraTS2021_00000_seg\.nii\.gz$/);
});

test('the report is a direct, refreshable route and not a stored patient report', () => {
  assert.equal(sampleReportPath('patient-uuid'), '/patients/patient-uuid/reports?sample=brats2021_00000');
  assert.equal(isBratsSampleReport('brats2021_00000'), true);
  assert.equal(isBratsSampleReport('fake-id'), false);
  assert.equal(isBratsSampleReport(null), false);
});
