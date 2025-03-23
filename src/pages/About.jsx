<<<<<<< HEAD
// pages/About.jsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import './About.css';

const About = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    return (
        <motion.div
            className="about-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="about-content">
                <motion.div
                    className="hero-section"
                    {...fadeIn}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="about-title">
                        NeuroVision: 3D Brain Tumor Segmentation with Deep Learning
                    </h1>

                </motion.div>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.3 }}
                >
                    <h2 id="pro-over">Project Overview</h2>
                    <div className="section-with-image">
                        <div className="section-content">
                            <p>NeuroVision is an advanced AI-driven system for automated 3D brain tumor segmentation, leveraging state-of-the-art deep learning techniques. The platform integrates a 3D U-Net architecture to accurately delineate tumor regions from multi-modal MRI scans. This technology aims to enhance diagnostic precision, streamline clinical workflows, and facilitate research in neuro-oncology.</p>
                        </div>
                        <img
                            src="src/images/3D-Brain-Model.png"
                            alt="3D Brain visualization"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.4 }}
                >
                    <h2>Technical Framework</h2>
                    <h3>Dataset Utilization & Preprocessing</h3>
                    <div className="image-grid">
                        <div className="image-item">
                            <img
                                src="src/images/Flair-MRI.png"
                                alt="FLAIR MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">FLAIR Sequence</p>
                        </div>
                        <div className="image-item">
                            <img
                                src="src/images/T1-MRI.png"
                                alt="T1 MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">T1 Sequence</p>
                        </div>
                        <div className="image-item">
                            <img
                                src="src/images/T1CE-MRI.png"
                                alt="T1ce MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">T1ce Sequence</p>
                        </div>
                    </div>

                    <h4>Data Preprocessing:</h4>
                    <ul>
                        <li>Normalization of intensity values across MRI sequences</li>
                        <li>Resampling to a uniform voxel spacing</li>
                        <li>Skull stripping and background noise reduction</li>
                        <li>Label encoding for tumor substructures</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.5 }}
                >
                    <h3>Model Architecture: 3D U-Net</h3>
                    <div className="section-with-image">
                        <div className="section-content">
                            <h4>Encoder-Decoder Structure:</h4>
                            <ul>
                                <li>Contracting path with 3D convolutional layers, batch normalization, and ReLU activations</li>
                                <li>Expanding path with transposed convolutions for precise localization</li>
                            </ul>

                            <h4>Skip Connections:</h4>
                            <p>Retains spatial information across depth levels for enhanced segmentation accuracy.</p>

                            <h4>Loss Function:</h4>
                            <p>Hybrid Loss: Combination of Dice loss and binary cross-entropy loss to address class imbalance.</p>
                        </div>
                        <img
                            src="src/images/u-net.png"
                            alt="U-Net Architecture"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.6 }}
                >
                    <h2>Clinical Impact</h2>
                    <div className="section-with-image">
                        <div className="section-content">
                            <h3>Clinical Integration</h3>
                            <ul>
                                <li>Radiology Assistance: AI-assisted segmentation accelerates radiological assessments</li>
                                <li>Surgical Planning: High-resolution tumor segmentation aids in preoperative planning</li>
                            </ul>

                            <h3>Research & Development</h3>
                            <ul>
                                <li>AI-Driven Precision Medicine: Enables large-scale analysis for biomarker discovery</li>
                                <li>Multi-Institutional Collaboration: Facilitates federated learning approaches</li>
                            </ul>
                        </div>
                        <img
                            src="src/images/clinical-impact.png"
                            alt="Clinical Impact Visualization"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.7 }}
                >
                    <h2>Future Enhancements</h2>
                    <ul>
                        <li>Model Optimization: Exploring attention mechanisms for enhanced feature learning</li>
                        <li>Real-Time Inference: Implementing efficient inference frameworks via TensorRT</li>
                        <li>Cloud Deployment: Scalable API for remote access and telemedicine integration</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.8 }}
                >
                    <h2>Conclusion</h2>
                    <p>NeuroVision represents a significant advancement in AI-powered neuroimaging by integrating deep learning methodologies for precise brain tumor segmentation. By bridging computational intelligence with clinical applications, this project aims to enhance diagnostic capabilities, improve patient outcomes, and accelerate innovations in medical imaging.</p>
                </motion.section>
            </div>
        </motion.div>
    );
};

=======
// pages/About.jsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import './About.css';

const About = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    return (
        <motion.div
            className="about-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="about-content">
                <motion.div
                    className="hero-section"
                    {...fadeIn}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="about-title">
                        NeuroVision: 3D Brain Tumor Segmentation with Deep Learning
                    </h1>

                </motion.div>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.3 }}
                >
                    <h2 id="pro-over">Project Overview</h2>
                    <div className="section-with-image">
                        <div className="section-content">
                            <p>NeuroVision is an advanced AI-driven system for automated 3D brain tumor segmentation, leveraging state-of-the-art deep learning techniques. The platform integrates a 3D U-Net architecture to accurately delineate tumor regions from multi-modal MRI scans. This technology aims to enhance diagnostic precision, streamline clinical workflows, and facilitate research in neuro-oncology.</p>
                        </div>
                        <img
                            src="src/images/3D-Brain-Model.png"
                            alt="3D Brain visualization"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.4 }}
                >
                    <h2>Technical Framework</h2>
                    <h3>Dataset Utilization & Preprocessing</h3>
                    <div className="image-grid">
                        <div className="image-item">
                            <img
                                src="src/images/Flair-MRI.png"
                                alt="FLAIR MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">FLAIR Sequence</p>
                        </div>
                        <div className="image-item">
                            <img
                                src="src/images/T1-MRI.png"
                                alt="T1 MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">T1 Sequence</p>
                        </div>
                        <div className="image-item">
                            <img
                                src="src/images/T1CE-MRI.png"
                                alt="T1ce MRI"
                                className="grid-image"
                            />
                            <p className="image-caption">T1ce Sequence</p>
                        </div>
                    </div>

                    <h4>Data Preprocessing:</h4>
                    <ul>
                        <li>Normalization of intensity values across MRI sequences</li>
                        <li>Resampling to a uniform voxel spacing</li>
                        <li>Skull stripping and background noise reduction</li>
                        <li>Label encoding for tumor substructures</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.5 }}
                >
                    <h3>Model Architecture: 3D U-Net</h3>
                    <div className="section-with-image">
                        <div className="section-content">
                            <h4>Encoder-Decoder Structure:</h4>
                            <ul>
                                <li>Contracting path with 3D convolutional layers, batch normalization, and ReLU activations</li>
                                <li>Expanding path with transposed convolutions for precise localization</li>
                            </ul>

                            <h4>Skip Connections:</h4>
                            <p>Retains spatial information across depth levels for enhanced segmentation accuracy.</p>

                            <h4>Loss Function:</h4>
                            <p>Hybrid Loss: Combination of Dice loss and binary cross-entropy loss to address class imbalance.</p>
                        </div>
                        <img
                            src="src/images/u-net.png"
                            alt="U-Net Architecture"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.6 }}
                >
                    <h2>Clinical Impact</h2>
                    <div className="section-with-image">
                        <div className="section-content">
                            <h3>Clinical Integration</h3>
                            <ul>
                                <li>Radiology Assistance: AI-assisted segmentation accelerates radiological assessments</li>
                                <li>Surgical Planning: High-resolution tumor segmentation aids in preoperative planning</li>
                            </ul>

                            <h3>Research & Development</h3>
                            <ul>
                                <li>AI-Driven Precision Medicine: Enables large-scale analysis for biomarker discovery</li>
                                <li>Multi-Institutional Collaboration: Facilitates federated learning approaches</li>
                            </ul>
                        </div>
                        <img
                            src="src/images/clinical-impact.png"
                            alt="Clinical Impact Visualization"
                            className="section-image"
                        />
                    </div>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.7 }}
                >
                    <h2>Future Enhancements</h2>
                    <ul>
                        <li>Model Optimization: Exploring attention mechanisms for enhanced feature learning</li>
                        <li>Real-Time Inference: Implementing efficient inference frameworks via TensorRT</li>
                        <li>Cloud Deployment: Scalable API for remote access and telemedicine integration</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="about-section"
                    {...fadeIn}
                    transition={{ delay: 0.8 }}
                >
                    <h2>Conclusion</h2>
                    <p>NeuroVision represents a significant advancement in AI-powered neuroimaging by integrating deep learning methodologies for precise brain tumor segmentation. By bridging computational intelligence with clinical applications, this project aims to enhance diagnostic capabilities, improve patient outcomes, and accelerate innovations in medical imaging.</p>
                </motion.section>
            </div>
        </motion.div>
    );
};

>>>>>>> 0de1c88 (Updated project files)
export default About;