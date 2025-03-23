<<<<<<< HEAD
import React from 'react';
import productImage1 from "../images/Ai-chatbot.jpeg";
import productImage2 from "../images/Brain-tumour-seg.jpeg";

function Products() {
  return (
    <section className="products-section" id="products">
      <h2 className="section-title">Our Products</h2>

      <div className="products-container">
        {/* AI Chatbot Card */}
        <div className="product-card">
          <div className="product-header">
            <div className="product-bg chatbot-bg"></div>
            <div className="product-pattern chatbot-pattern"></div>
            <div className="product-icon">
              <img src={productImage1} alt="Chatbot Icon" />
            </div>
          </div>
          <div className="product-content">
            <h3 className="product-title">AI-powered Chatbot</h3>
            <p className="product-description">Engage with patients and medical professionals in real-time through a smart chatbot interface. Our AI understands medical terminology and provides accurate responses.</p>
            <a href="#learn-more-chatbot" className="product-cta">Learn More</a>
          </div>
        </div>

        {/* Brain Tumor Segmentation Card */}
        <div className="product-card">
          <div className="product-header">
            <div className="product-bg segmentation-bg"></div>
            <div className="product-pattern segmentation-pattern"></div>
            <div className="product-icon">
              <img src={productImage2} alt="Brain Icon" />
            </div>
          </div>
          <div className="product-content">
            <h3 className="product-title">Brain Tumor Segmentation</h3>
            <p className="product-description">Accurately detect and segment brain tumors in medical images with AI-driven precision. Support for MRI, CT, and other neuroimaging modalities.</p>
            <a href="/about" className="product-cta">Learn More</a>
          </div>
        </div>
      </div>
    </section>
  );
}

=======
import React from 'react';
import productImage1 from "../images/Ai-chatbot.jpeg";
import productImage2 from "../images/Brain-tumour-seg.jpeg";

function Products() {
  return (
    <section className="products-section" id="products">
      <h2 className="section-title">Our Products</h2>

      <div className="products-container">
        {/* AI Chatbot Card */}
        <div className="product-card">
          <div className="product-header">
            <div className="product-bg chatbot-bg"></div>
            <div className="product-pattern chatbot-pattern"></div>
            <div className="product-icon">
              <img src={productImage1} alt="Chatbot Icon" />
            </div>
          </div>
          <div className="product-content">
            <h3 className="product-title">AI-powered Chatbot</h3>
            <p className="product-description">Engage with patients and medical professionals in real-time through a smart chatbot interface. Our AI understands medical terminology and provides accurate responses.</p>
            <a href="#learn-more-chatbot" className="product-cta">Learn More</a>
          </div>
        </div>

        {/* Brain Tumor Segmentation Card */}
        <div className="product-card">
          <div className="product-header">
            <div className="product-bg segmentation-bg"></div>
            <div className="product-pattern segmentation-pattern"></div>
            <div className="product-icon">
              <img src={productImage2} alt="Brain Icon" />
            </div>
          </div>
          <div className="product-content">
            <h3 className="product-title">Brain Tumor Segmentation</h3>
            <p className="product-description">Accurately detect and segment brain tumors in medical images with AI-driven precision. Support for MRI, CT, and other neuroimaging modalities.</p>
            <a href="/about" className="product-cta">Learn More</a>
          </div>
        </div>
      </div>
    </section>
  );
}

>>>>>>> 0de1c88 (Updated project files)
export default Products;