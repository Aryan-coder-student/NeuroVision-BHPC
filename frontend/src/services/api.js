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

export async function fetchPatients(workspaceId, { signal } = {}) {
  const res = await tenantRequest(workspaceId, {
    method: 'get',
    url: '/tenant/patients/',
    signal,
  });
  return Array.isArray(res.data) ? res.data : res.data.results || [];
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

const SEGMENTATION_BASE = 'http://127.0.0.1:5000';
/** 3D Brain Segmentation: POST /predict */
export async function runSegmentation(patientFolder, modelVersion) {
  const res = await axios.post(`${SEGMENTATION_BASE}/predict`, {
    patient_folder: patientFolder,
    model_version: modelVersion || undefined,
  });
  return res.data;
}

const VQA_BASE = 'https://pahariaryan121-neurovision-api.hf.space';

/** VQA Chat: POST /predict/ */
export async function sendVQAQuery(query, imageBlob, modelVersion) {
  const formData = new FormData();
  formData.append('question', query);
  if (modelVersion) formData.append('model_version', modelVersion);
  if (imageBlob) {
    formData.append('file', imageBlob, 'vqa_demo.jpg');
  }
  const res = await axios.post(`${VQA_BASE}/predict/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

/** Mock Endpoint: Fetch Available Models */
export async function fetchAvailableModels(type) {
  // Simulating an API call to a backend model registry
  await new Promise(r => setTimeout(r, 600));
  if (type === 'segmentation') {
    return [
      { id: '3d_unet_v2', name: '3D-UNet v2.1 (Optimized)', status: 'Deployed' },
      { id: '3d_unet_v1', name: '3D-UNet v1.0 (Legacy)', status: 'Archived' },
      { id: 'swin_unetr', name: 'SwinUNETR Medical', status: 'In-Training' },
    ];
  } else if (type === 'vqa') {
    return [
      { id: 'blip_med_v1', name: 'BLIP-Med VQA v1', status: 'Deployed' },
      { id: 'llava_med_15', name: 'LLaVA-Med v1.5', status: 'Deployed' },
      { id: 'gemma_4_med', name: 'Gemma-4-Med (Experimental)', status: 'In-Training' },
    ];
  }
  return [];
}

export function setTenantDomain() {
  // Render uses a shared backend URL; never switch to unprovisioned subdomains.
  djangoApi.defaults.baseURL = config.API_URL;
}

// All API requests stay on the single configured backend origin.
