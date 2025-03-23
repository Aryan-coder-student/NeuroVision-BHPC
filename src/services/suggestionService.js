// Mock data storage
let mockSuggestions = [];

const suggestionService = {
  // Get all suggestions
  getAllSuggestions: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockSuggestions;
  },

  // Submit a new suggestion
  submitSuggestion: async (formData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new suggestion with mock data
    const newSuggestion = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      createdAt: new Date().toISOString(),
      votes: 0
    };

    // Add to mock storage
    mockSuggestions.push(newSuggestion);
    
    return {
      success: true,
      message: 'Suggestion submitted successfully',
      data: newSuggestion
    };
  },

  // Vote on a suggestion
  voteSuggestion: async (suggestionId, voteType) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const suggestion = mockSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.votes += voteType === 'up' ? 1 : -1;
      return {
        success: true,
        message: 'Vote updated successfully',
        data: suggestion
      };
    }
    throw new Error('Suggestion not found');
  },

  // Get a single suggestion by ID
  getSuggestionById: async (suggestionId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const suggestion = mockSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      return suggestion;
    }
    throw new Error('Suggestion not found');
  }
};

export default suggestionService; 