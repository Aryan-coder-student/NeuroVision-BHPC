import React, { useState } from 'react';
import suggestionService from '../services/suggestionService';

// CSS is included at the end of this file
import './Suggestion.css';

const Suggestion = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess(false);
      
      const response = await suggestionService.submitSuggestion(formData);
      
      if (response.success) {
        setSuccess(true);
        setFormData({ title: '', description: '', category: 'feature' });
      } else {
        throw new Error(response.message || 'Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chat-and-vqa-container">
      <div className="hero-section">
        <h1>NeuroVision</h1>
        <p>Submit Your Suggestions</p>
      </div>

      <div className="suggestion-form-container">
        <form onSubmit={handleSubmit} className="chat-input-container">
          <div className="input-row">
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Suggestion title"
              className="chat-input"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="input-row">
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="chat-input"
              disabled={isSubmitting}
            >
              <option value="feature">New Feature</option>
              <option value="improvement">Improvement</option>
              <option value="bug">Bug Fix</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="input-row">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your suggestion in detail"
              className="chat-input suggestion-textarea"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Suggestion submitted successfully!</p>}

          <div className="input-row">
            <button 
              type="submit" 
              className="chat-submit" 
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Suggestion;