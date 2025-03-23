import express from 'express';
import { json } from 'body-parser';
import suggestionRoutes from './routes/suggestions.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(json());
app.use('/api/suggestions', suggestionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
