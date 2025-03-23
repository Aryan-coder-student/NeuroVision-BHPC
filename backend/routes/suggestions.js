import express from 'express';
import Suggestion from '../models/Suggestion.js'; // This will be created later
const router = express.Router();

// POST /suggestions - Submit a new suggestion
router.post('/', async (req, res) => {
  const { title, description, author } = req.body;
  const newSuggestion = new Suggestion({ title, description, author });
  
  try {
    await newSuggestion.save();
    res.status(201).json(newSuggestion);
  } catch (error) {
    res.status(500).json({ message: 'Error saving suggestion', error });
  }
});

// GET /suggestions - Retrieve all suggestions
router.get('/', async (req, res) => {
  try {
    const suggestions = await Suggestion.find();
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving suggestions', error });
  }
});

export default router;
