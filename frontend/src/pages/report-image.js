/** Snapshot the already-rendered NiiVue canvas without downloading any MRI/mask. */
export function captureViewerPng(canvas, viewer) {
  if (!canvas || !viewer || !canvas.width || !canvas.height) {
    return Promise.reject(new Error('Open a 3D segmentation view before capturing a report image.'));
  }
  viewer.drawScene();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || !blob.size) {
        reject(new Error('Could not capture the 3D renderer. Try another view.'));
      } else if (blob.size > 3 * 1024 * 1024) {
        reject(new Error('The 3D snapshot exceeds the 3 MB report limit.'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to preview the segmentation snapshot.'));
    reader.readAsDataURL(blob);
  });
}
