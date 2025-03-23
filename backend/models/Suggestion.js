import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: String, required: true },
  timeAgo: { type: String, default: 'Just now' },
  votes: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false },
  isNew: { type: Boolean, default: true },
}, { timestamps: true });

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

export default Suggestion;
