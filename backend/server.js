import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = "mongodb://omkar:omkar@ac-aqxnxqw-shard-00-00.mongodb.net:27017,ac-aqxnxqw-shard-00-01.mongodb.net:27017,ac-aqxnxqw-shard-00-02.mongodb.net:27017/neurovision?ssl=true&replicaSet=atlas-cluster0&authSource=admin";
let client = null;

async function connectToMongoDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    if (!client) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        connectTimeoutMS: 10000, // 10 second connection timeout
        socketTimeoutMS: 10000 // 10 second socket timeout
      });
      await client.connect();
      console.log('Connected to MongoDB Atlas successfully');
    }
    const db = client.db('neurovision');
    // Test the connection
    await db.command({ ping: 1 });
    console.log("Database connection is working");
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to MongoDB server. Please check:');
      console.error('1. Your network connection');
      console.error('2. MongoDB Atlas connection string');
      console.error('3. MongoDB Atlas IP whitelist');
      console.error('4. MongoDB Atlas username and password');
      console.error('5. Network configuration (try using PowerShell instead of Git Bash)');
    }
    // Close the client if connection fails
    if (client) {
      await client.close();
      client = null;
    }
    throw error;
  }
}

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    console.log('Testing connection...');
    const db = await connectToMongoDB();
    res.json({ message: 'Server is running and connected to MongoDB!' });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Failed to connect to MongoDB', details: error.message });
  }
});

// API Routes
app.get('/api/suggestions', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const suggestions = await db.collection('suggestions').find({}).toArray();
    console.log('Fetched suggestions:', suggestions);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions', details: error.message });
  }
});

app.post('/api/suggestions', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const newSuggestion = {
      ...req.body,
      createdAt: new Date(),
      votes: 0
    };
    const result = await db.collection('suggestions').insertOne(newSuggestion);
    console.log('Created suggestion:', { ...newSuggestion, _id: result.insertedId });
    res.status(201).json({ ...newSuggestion, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to create suggestion', details: error.message });
  }
});

app.post('/api/suggestions/:id/vote', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const { id } = req.params;
    const { voteType } = req.body;
    const voteChange = voteType === 'upvote' ? 1 : -1;
    
    const result = await db.collection('suggestions').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { votes: voteChange } }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating vote:', error);
    res.status(500).json({ error: 'Failed to update vote' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server with error handling
app.listen(port, async () => {
  try {
    console.log(`Server starting on port ${port}...`);
    // Test MongoDB connection on server start
    await connectToMongoDB();
    console.log(`Server running on port ${port}`);
    console.log(`Test the server at http://localhost:${port}/api/test`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please try a different port or kill the process using this port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
