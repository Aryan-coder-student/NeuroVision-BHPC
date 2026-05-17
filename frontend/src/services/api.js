import axios from 'axios';
import { config } from '../config';

// --- Django Backend API Configuration ---
export const djangoApi = axios.create({
  withCredentials: true,
  baseURL: config.API_URL,
});

djangoApi.interceptors.request.use((config) => {
  const unsafeMethods = ['post', 'put', 'patch', 'delete'];
  if (unsafeMethods.includes(config.method)) {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
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
    await djangoApi.get(`${AUTH_BASE}/csrf/`);
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

export async function fetchCurrentWorkspace() {
  const res = await djangoApi.get(`${WORKSPACE_BASE}/current/`);
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

export function setTenantDomain(domainUrl) {
  if (domainUrl) {
    djangoApi.defaults.baseURL = `${config.protocol}//${domainUrl}/api/v1`;
  } else {
    djangoApi.defaults.baseURL = config.API_URL;
  }
}

// Auto-restore tenant from session storage on initial boot
try {
  const saved = sessionStorage.getItem('nv_session');
  if (saved) {
    const { org } = JSON.parse(saved);
    if (org && org.domain_url) {
      djangoApi.defaults.baseURL = `${config.protocol}//${org.domain_url}/api/v1`;
    }
  }
} catch (e) {
  console.error("Failed to restore tenant from session storage", e);
}
