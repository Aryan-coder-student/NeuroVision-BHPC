<<<<<<< HEAD
import React, { useState, useEffect } from 'react';

const ChatAndVQA: React.FC = () => {
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle image upload and preview
  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);

      // Cleanup memory when the component unmounts or image changes
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      if (image) {
        // Handle VQA submission with image and question
        const formData = new FormData();
        formData.append('file', image);
        formData.append('question', chatInput);

        const response = await fetch('http://127.0.0.1:5000/predict/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get prediction');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // Display image, question, and answer in chat
        setChatMessages(prevMessages => [
          ...prevMessages,
          { role: 'user', content: chatInput, imageUrl },
          { role: 'assistant', content: data.answer }
        ]);
      } else {
        // Handle ChatBot submission (text-only)
        const response = await fetch('http://127.0.0.1:5000/chat/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: chatInput }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get chat response');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setChatMessages(prevMessages => [
          ...prevMessages,
          { role: 'user', content: chatInput },
          { role: 'assistant', content: data.response }
        ]);
      }

      // Clear input and image after processing
      setChatInput('');
      setImage(null);
      setImageUrl(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      // Clear any existing image before setting a new one
      setImage(file);
    }
  };

  // Remove image preview
  const removeImage = () => {
    setImage(null);
    setImageUrl(null);
  };

  return (
    <div className="chat-and-vqa-container">
      <div className="hero-section">
        <h1>NeuroVision</h1>
        <p>Chat with our NeuroVision Bot</p>
      </div>

      <div className="chat-messages">
        {chatMessages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.imageUrl && (
              <div className="image-preview">
                <img src={message.imageUrl} alt="Uploaded" className="uploaded-image-chat" />
              </div>
            )}
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
      </div>

      <form onSubmit={handleChatSubmit} className="chat-input-container">
        <div className="image-indicator">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="image-upload-input"
            disabled={isLoading}
          />
        </div>

        {imageUrl && (
          <div className="image-preview-wrapper">
            <img src={imageUrl} alt="Uploaded" className="uploaded-image" />
            <button type="button" onClick={removeImage} className="remove-image-btn">×</button>
          </div>
        )}

        <div className="input-row">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your question here..."
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" className="chat-submit" disabled={isLoading || (!chatInput && !image)}>
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default ChatAndVQA;
=======
import React, { useState, useEffect } from 'react';

const ChatAndVQA: React.FC = () => {
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle image upload and preview
  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);

      // Cleanup memory when the component unmounts or image changes
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      if (image) {
        // Handle VQA submission with image and question
        const formData = new FormData();
        formData.append('file', image);
        formData.append('question', chatInput);

        const response = await fetch('http://127.0.0.1:5000/predict/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get prediction');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // Display image, question, and answer in chat
        setChatMessages(prevMessages => [
          ...prevMessages,
          { role: 'user', content: chatInput, imageUrl },
          { role: 'assistant', content: data.answer }
        ]);
      } else {
        // Handle ChatBot submission (text-only)
        const response = await fetch('http://127.0.0.1:5000/chat/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: chatInput }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get chat response');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setChatMessages(prevMessages => [
          ...prevMessages,
          { role: 'user', content: chatInput },
          { role: 'assistant', content: data.response }
        ]);
      }

      // Clear input and image after processing
      setChatInput('');
      setImage(null);
      setImageUrl(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      // Clear any existing image before setting a new one
      setImage(file);
    }
  };

  // Remove image preview
  const removeImage = () => {
    setImage(null);
    setImageUrl(null);
  };

  return (
    <div className="chat-and-vqa-container">
      <div className="hero-section">
        <h1>NeuroVision</h1>
        <p>Chat with our NeuroVision Bot</p>
      </div>

      <div className="chat-messages">
        {chatMessages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.imageUrl && (
              <div className="image-preview">
                <img src={message.imageUrl} alt="Uploaded" className="uploaded-image-chat" />
              </div>
            )}
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
      </div>

      <form onSubmit={handleChatSubmit} className="chat-input-container">
        <div className="image-indicator">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="image-upload-input"
            disabled={isLoading}
          />
        </div>

        {imageUrl && (
          <div className="image-preview-wrapper">
            <img src={imageUrl} alt="Uploaded" className="uploaded-image" />
            <button type="button" onClick={removeImage} className="remove-image-btn">×</button>
          </div>
        )}

        <div className="input-row">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your question here..."
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" className="chat-submit" disabled={isLoading || (!chatInput && !image)}>
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default ChatAndVQA;
>>>>>>> 0de1c88 (Updated project files)
