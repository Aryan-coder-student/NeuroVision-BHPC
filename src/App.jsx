<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Products from "./components/Products";
import Chat from "./components/Chat";
import About from "./pages/About";
import NotFound from "./components/NotFound";
import BrainSegmentationViewer from "./components/BrainSegmentationViewer"; // Import the new component

function HomePage() {
  return (
    <>
      <Hero />
      <Products />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/products" element={<Products />} />
            <Route path="/about" element={<About />} />
            <Route path="/brain-segmentation" element={<BrainSegmentationViewer />} /> {/* New route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
=======
export default App;
>>>>>>> a6a8e6ddd790e049e199c4e1ff482e3e4e9ab621
=======
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Products from './components/Products';
import Chat from './components/Chat';
import About from './pages/About';
import NotFound from './components/NotFound';
import NeurovisionSuggestions from './components/NeurovisionSuggestions';
import { useState } from 'react';

function HomePage() {
  return (
    <>
      <Hero />
      <Products />
    </>
  );
}

function BrainTumorInput() {
  const [segmentationData, setSegmentationData] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const handleUpload = (files) => {
    // Handle file upload logic here
    console.log('Files uploaded:', files);
    // For testing purposes, set some dummy data
    setSegmentationData({ data: new Float32Array(64 * 64 * 64).fill(0.5), dims: [64, 64, 64] });
    setStatistics({
      volume: 1234.56,
      surfaceArea: 789.01,
      location: 'Frontal Lobe',
      confidence: 95.5,
      processingTime: 2.3,
      modelVersion: '1.0.0'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Brain Tumor Segmentation</h1>
      <UploadForm onUpload={handleUpload} />
      <Results segmentationData={segmentationData} statistics={statistics} />
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/suggestions" element={<NeurovisionSuggestions />} />
          <Route path="/inputpatientneuro" element={<BrainTumorInput />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
>>>>>>> 0de1c88 (Updated project files)
