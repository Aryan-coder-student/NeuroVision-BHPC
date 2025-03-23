const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    // Test server connection
    console.log('Testing server connection...');
    const testResponse = await axios.get(`${API_URL}/test`);
    console.log('Server connection test:', testResponse.data);

    // Test getting user suggestions
    console.log('\nTesting GET /api/user-suggestions...');
    const suggestionsResponse = await axios.get(`${API_URL}/user-suggestions`);
    console.log('Current user suggestions:', suggestionsResponse.data);

    // Test creating a new user suggestion
    console.log('\nTesting POST /api/user-suggestions...');
    const newSuggestion = {
      title: 'Test User Suggestion',
      description: 'This is a test user suggestion',
      category: 'feature'
    };
    const createResponse = await axios.post(`${API_URL}/user-suggestions`, newSuggestion);
    console.log('Created user suggestion:', createResponse.data);

  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testAPI(); 