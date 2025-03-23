import React, { useState, useEffect } from "react";
import axios from "axios";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkHttpDataSetReader from "@kitware/vtk.js/IO/Core/HttpDataSetReader";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";

const BrainSegmentationViewer = () => {
  const [file, setFile] = useState(null);
  const [segmentationUrl, setSegmentationUrl] = useState(null);

  useEffect(() => {
    if (segmentationUrl) {
      renderSegmentedMRI(segmentationUrl);
    }
  }, [segmentationUrl]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSegmentationUrl(`http://127.0.0.1:5000/download/${response.data.filename}`);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const renderSegmentedMRI = (url) => {
    const container = document.getElementById("vtk-container");
    container.innerHTML = ""; // Clear previous render

    const renderWindow = vtkGenericRenderWindow.newInstance();
    renderWindow.setContainer(container);
    const renderer = renderWindow.getRenderer();
    const renderWindowObj = renderWindow.getRenderWindow();

    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    reader.setUrl(url).then(() => {
      const volumeMapper = vtkVolumeMapper.newInstance();
      volumeMapper.setInputConnection(reader.getOutputPort());

      const volume = vtkVolume.newInstance();
      volume.setMapper(volumeMapper);

      renderer.addVolume(volume);
      renderer.resetCamera();
      renderWindowObj.render();
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Brain Tumor Segmentation</h2>
      <input type="file" accept=".nii,.nii.gz" onChange={handleFileChange} />
      <button onClick={uploadFile}>Upload & Segment</button>

      <div id="vtk-container" style={{ width: "600px", height: "600px", margin: "auto" }}></div>
    </div>
  );
};

export default BrainSegmentationViewer;
