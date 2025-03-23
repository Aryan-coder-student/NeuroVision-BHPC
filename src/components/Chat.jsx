import BrainModelViewer from './BrainModelViewer';
import { useState } from 'react';

function Chat() {
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [niftiFiles, setNiftiFiles] = useState([]);

  const handleFileSelection = async (event) => {
    const files = Array.from(event.target.files);
    
    // Ensure only NIfTI files are selected
    const niiFiles = files
      .filter(file => file.name.endsWith(".nii"))
      .map(file => URL.createObjectURL(file)); // Convert to object URL for loading

    if (niiFiles.length !== 4) {
      alert("Please select exactly 4 NIfTI files.");
      return;
    }

    setNiftiFiles(niiFiles);
    setShow3DViewer(true);
  };

  return (
    <div className="chat-container">
      <button onClick={() => setShow3DViewer(!show3DViewer)}>
        {show3DViewer ? 'Show Chat' : 'Show 3D Brain Model'}
      </button>

      {!show3DViewer && (
        <>
          <input type="file" multiple onChange={handleFileSelection} />
          <p>Select 4 NIfTI files to render the brain model.</p>
        </>
      )}

      {show3DViewer && niftiFiles.length === 4 && <BrainModelViewer niftiFiles={niftiFiles} />}
    </div>
  );
}

export default Chat;
