import React, { useRef, useState } from "react";
import * as THREE from "three";
import nifti from "nifti-reader-js";

const BrainModelViewer = () => {
    const [error, setError] = useState("");
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);

    // Simulate fetching folder with 4 NIfTI files
    const sampleFiles = [
        "/models/layer1.nii", // Replace with your actual file paths
        "/models/layer2.nii",
        "/models/layer3.nii",
        "/models/layer4.nii",
    ];

    const renderBrainModel = async () => {
        setError("");
        try {
            // Load all files
            const buffers = await Promise.all(
                sampleFiles.map(async (filePath) => {
                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error(`Failed to load: ${filePath}`);
                    return response.arrayBuffer();
                })
            );

            // Validate and parse NIfTI files
            const volumes = buffers.map((arrayBuffer, index) => {
                if (!nifti.isNIFTI(arrayBuffer)) {
                    throw new Error(`File ${sampleFiles[index]} is not a valid NIfTI file.`);
                }
                const header = nifti.readHeader(arrayBuffer);
                const imageData = nifti.readImage(header, arrayBuffer);
                console.log(`Loaded NIfTI file ${sampleFiles[index]}:`, {
                    dimensions: header.dims,
                    imageData,
                });
                return { header, imageData };
            });

            // Initialize Three.js scene
            let scene = sceneRef.current;
            let renderer = rendererRef.current;
            let camera = cameraRef.current;

            if (!scene) {
                scene = new THREE.Scene();
                sceneRef.current = scene;

                camera = new THREE.PerspectiveCamera(
                    75,
                    window.innerWidth / window.innerHeight,
                    0.1,
                    1000
                );
                camera.position.z = 50;
                cameraRef.current = camera;

                renderer = new THREE.WebGLRenderer();
                renderer.setSize(window.innerWidth, window.innerHeight);
                document.body.appendChild(renderer.domElement);
                rendererRef.current = renderer;
            }

            // Create a 3D brain model from the NIfTI volumes
            const geometry = new THREE.BoxGeometry(20, 20, 20); // Placeholder geometry
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
            });
            const brainModel = new THREE.Mesh(geometry, material);
            scene.add(brainModel);

            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                brainModel.rotation.x += 0.01;
                brainModel.rotation.y += 0.01;
                renderer.render(scene, camera);
            };
            animate();

        } catch (err) {
            console.error("Error rendering brain model:", err);
            setError(err.message);
        }
    };

    return (
        <div>
            <button onClick={renderBrainModel}>Show 3D Brain Model</button>
            {error && <div style={{ color: "red" }}>Error: {error}</div>}
        </div>
    );
};

export default BrainModelViewer;
