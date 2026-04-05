import axios from 'axios';

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
