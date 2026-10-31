import axios from 'axios';
import { config } from '../config';
import { buildTenantApiUrl } from './tenant-api-url';

// --- Django Backend API Configuration ---
export const djangoApi = axios.create({
  withCredentials: true,
  baseURL: config.API_URL,
});

djangoApi.interceptors.request.use((config) => {
  const unsafeMethods = ['post', 'put', 'patch', 'delete'];
  if (unsafeMethods.includes(config.method)) {
    // 1. Try to read from cookie
    let csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
      
    // 2. Fall back to sessionStorage if blocked by cross-origin Same-Origin Policy
    if (!csrfToken) {
      csrfToken = sessionStorage.getItem('nv_csrf_token');
    }
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

const API_BASE = config.API_URL;
const AUTH_BASE = `${API_BASE}/auth`;
const WORKSPACE_BASE = `${API_BASE}/workspaces`;

export async function initializeCsrf() {
  try {
    const res = await djangoApi.get(`${AUTH_BASE}/csrf/`);
    if (res.data && res.data.csrf_token) {
      sessionStorage.setItem('nv_csrf_token', res.data.csrf_token);
    }
  } catch (error) {
    console.error("Failed to fetch CSRF token", error);
  }
}

export async function loginUser(credentials) {
  const res = await djangoApi.post(`${AUTH_BASE}/login/`, credentials);
  return res.data;
}

export async function logoutUser() {
  const res = await djangoApi.post(`${AUTH_BASE}/logout/`);
  return res.data;
}

export async function fetchUserProfile() {
  const res = await djangoApi.get(`${AUTH_BASE}/profile/`);
  return res.data;
}

/** Register User: POST /auth/register/ */
export async function registerUser(userData) {
  const res = await djangoApi.post(`${AUTH_BASE}/register/`, userData);
  return res.data;
}

/** Verify OTP: POST /auth/verify-otp/ */
export async function verifyOTP(email, otp) {
  const res = await djangoApi.post(`${AUTH_BASE}/verify-otp/`, { email, otp });
  return res.data;
}

/** Resend OTP: POST /auth/resend-otp/ */
export async function resendOTP(email) {
  const res = await djangoApi.post(`${AUTH_BASE}/resend-otp/`, { email });
  return res.data;
}

/** Workspace Management */
export async function fetchWorkspaces() {
  const res = await djangoApi.get(`${WORKSPACE_BASE}/`);
  return res.data;
}

export async function fetchCurrentWorkspace(workspaceId) {
  const res = await djangoApi.get(`${WORKSPACE_BASE}/current/`, {
    headers: workspaceId ? { 'X-Workspace-ID': workspaceId } : {}
  });
  return res.data;
}

/** The verified tenant context comes from backend middleware, not sessionStorage.
 *  Keep tenant headers limited to this explicitly scoped API helper.
 */
export async function fetchTenantContext(workspaceId) {
  if (!workspaceId) throw new Error('A workspace ID is required');
  const res = await djangoApi.get(`${API_BASE}/tenant/context/`, {
    headers: { 'X-Workspace-ID': workspaceId }
  });
  if (String(res.data.id) !== String(workspaceId)) {
    throw new Error('Tenant context did not match selected workspace');
  }
  return res.data;
}

export async function tenantRequest(workspaceId, requestConfig) {
  if (!workspaceId) throw new Error('Select a workspace before using tenant APIs');
  const url = buildTenantApiUrl(API_BASE, requestConfig.url);
  const headers = { ...requestConfig.headers, 'X-Workspace-ID': workspaceId };
  return djangoApi.request({ ...requestConfig, url, headers });
}

export async function fetchPatients(workspaceId, { page = 1, pageSize = 25, signal } = {}) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: '/tenant/patients/',
    params: { page, page_size: pageSize },
    signal,
  });
  return res.data;
}

export async function fetchMyPatients({ workspaceId, search, page = 1, pageSize = 25, signal } = {}) {
  const params = {
    page,
    page_size: pageSize,
  };
  if (workspaceId) params.workspace_id = workspaceId;
  if (search) params.search = search;

  const res = await djangoApi.get(`${API_BASE}/my-patients/`, { params, signal });
  return res.data;
}

export async function createPatient(workspaceId, patient) {
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: '/tenant/patients/',
    data: patient,
  });
  return res.data;
}

export async function fetchPatient(workspaceId, patientId, { signal } = {}) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/`,
    signal,
  });
  return res.data;
}

/** Update editable demographics within the verified patient workspace. */
export async function updatePatientDetails(workspaceId, patientId, details) {
  const res = await tenantRequest(workspaceId, {
    method: 'patch',
    url: `/tenant/patients/${patientId}/`,
    data: details,
  });
  return res.data;
}

export async function fetchPatientGrant(workspaceId, patientId, { signal } = {}) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/identity-grant/`,
    signal,
  });
  return res.data;
}

export async function requestPatientGrant(workspaceId, patientId, email) {
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/identity-grant/request/`,
    data: { email },
  });
  return res.data;
}

export async function verifyPatientGrant(workspaceId, patientId, challengeId, otp) {
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/identity-grant/verify/`,
    data: { challenge_id: challengeId, otp },
  });
  return res.data;
}

export async function createWorkspace(data) {
  const res = await djangoApi.post(`${WORKSPACE_BASE}/`, data);
  return res.data;
}

/** Shared MRI upload packaging for existing inference and metadata-only intake. */
function buildMRIFormData(modalityFiles, extraFields = {}) {
  const formData = new FormData();
  Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value));
  for (const key of ['t1', 't1ce', 't2', 'flair']) {
    if (!modalityFiles[key]) throw new Error(`Missing required MRI modality: ${key}`);
    formData.append(key, modalityFiles[key]);
  }
  return formData;
}

/** Validate MRI files server-side and save only patient-scoped metadata. */
export async function recordImagingStudy(workspaceId, patientId, modalityFiles) {
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/imaging-studies/`,
    data: buildMRIFormData(modalityFiles),
  });
  return res.data;
}

export async function fetchImagingStudies(workspaceId, patientId, page = 1) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/imaging-studies/`,
    params: { page },
  });
  return res.data;
}

/** Tenant-authorized 3D brain segmentation routed through Django. */
export async function runSegmentation(workspaceId, patientId, modalityFiles, modelId) {
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/inference/segmentation/`,
    data: buildMRIFormData(modalityFiles, { model_id: modelId }),
  });
  return res.data;
}

/** Reports retain verified inference metadata and a static 3D PNG, never MRI bytes. */
export async function fetchSegmentationReports(workspaceId, patientId, page = 1) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/segmentation-reports/`,
    params: { page },
  });
  return res.data;
}

export async function fetchSegmentationReport(workspaceId, patientId, reportId) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/segmentation-reports/${reportId}/`,
  });
  return res.data;
}

export async function fetchSegmentationSnapshot(workspaceId, patientId, reportId) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: `/tenant/patients/${patientId}/segmentation-reports/${reportId}/snapshot/`,
    responseType: 'blob',
  });
  return res.data;
}

export async function saveSegmentationReport(workspaceId, patientId, reportToken, snapshot, imagingStudyId) {
  const data = new FormData();
  data.append('report_token', reportToken);
  data.append('snapshot', snapshot, 'segmentation-view.png');
  if (imagingStudyId) data.append('imaging_study_id', imagingStudyId);
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/segmentation-reports/`,
    data,
  });
  return res.data;
}

/** Tenant-authorized BLIP VQA routed through Django. */
export async function sendVQAQuery(workspaceId, patientId, query, imageBlob, modelId) {
  const formData = new FormData();
  formData.append('question', query);
  formData.append('model_id', modelId);
  if (imageBlob) {
    formData.append('image', imageBlob, 'vqa_demo.jpg');
  }
  const res = await tenantRequest(workspaceId, {
    method: 'post',
    url: `/tenant/patients/${patientId}/inference/vqa/`,
    data: formData,
  });
  return res.data;
}

/** Read the server-configured model catalog without asserting provider health. */
export async function fetchAvailableModels(workspaceId, capability) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: '/tenant/models/',
    params: capability ? { capability } : {},
  });
  return res.data.results;
}

export function setTenantDomain() {
  // Render uses a shared backend URL; never switch to unprovisioned subdomains.
  djangoApi.defaults.baseURL = config.API_URL;
}

// All API requests stay on the single configured backend origin.


/** Tenant-scoped metadata-only contribution requests. No scan bytes are transferred. */
export async function createDatasetContribution(workspaceId, details) {
  const res = await tenantRequest(workspaceId, {
    method: 'post', url: '/tenant/contributions/', data: details,
  });
  return res.data;
}

export async function fetchDatasetContributions(workspaceId) {
  const res = await tenantRequest(workspaceId, {
    method: 'get', url: '/tenant/contributions/',
  });
  return res.data;
}


/** Real model feedback persistence; never send scans or patient-identifying text. */
export async function createModelFeedback(workspaceId, details) {
  const res = await tenantRequest(workspaceId, {
    method: 'post', url: '/tenant/model-feedback/', data: details,
  });
  return res.data;
}

export async function fetchModelFeedback(workspaceId) {
  const res = await tenantRequest(workspaceId, {
    method: 'get', url: '/tenant/model-feedback/',
  });
  return res.data;
}
