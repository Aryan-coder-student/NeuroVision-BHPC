const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const USER_SUGGESTIONS_FILE = path.join(__dirname, 'user_suggestions.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read user suggestions from file
async function readUserSuggestions() {
  try {
    console.log('Reading user suggestions from:', USER_SUGGESTIONS_FILE);
    const data = await fs.readFile(USER_SUGGESTIONS_FILE, 'utf8');
    const suggestions = JSON.parse(data);
    console.log('Found user suggestions:', suggestions.length);
    return suggestions;
  } catch (error) {
    console.error('Error reading user suggestions:', error);
    if (error.code === 'ENOENT') {
      console.log('Creating new user suggestions file');
      await fs.writeFile(USER_SUGGESTIONS_FILE, JSON.stringify([]));
      return [];
    }
    throw error;
  }
}

// Helper function to write user suggestions to file
async function writeUserSuggestions(suggestions) {
  try {
    console.log('Writing user suggestions to file');
    await fs.writeFile(USER_SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    console.log('Successfully wrote user suggestions');
  } catch (error) {
    console.error('Error writing user suggestions:', error);
    throw error;
  }
}

// Routes
// Get all user suggestions
app.get('/api/user-suggestions', async (req, res) => {
  try {
    console.log('GET /api/user-suggestions - Fetching all user suggestions');
    const suggestions = await readUserSuggestions();
    res.json(suggestions);
  } catch (error) {
    console.error('Error in GET /api/user-suggestions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new user suggestion
app.post('/api/user-suggestions', async (req, res) => {
  try {
    console.log('POST /api/user-suggestions - Creating new user suggestion:', req.body);
    const suggestions = await readUserSuggestions();
    const newSuggestion = {
      id: Date.now().toString(),
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      createdAt: new Date().toISOString()
    };
    
    suggestions.push(newSuggestion);
    await writeUserSuggestions(suggestions);
    
    console.log('Successfully created new user suggestion');
    res.status(201).json(newSuggestion);
  } catch (error) {
    console.error('Error in POST /api/user-suggestions:', error);
    res.status(400).json({ message: error.message });
  }
});

// Test route to check server status
app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`User suggestions file location: ${USER_SUGGESTIONS_FILE}`);
}); 