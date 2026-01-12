console.log('Starting server debug...');

// Check environment
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());

// Try to load environment
require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

// Try to import modules
try {
  console.log('Importing express...');
  const express = require('express');
  console.log('✅ Express imported');
  
  console.log('Importing mongoose...');
  const mongoose = require('mongoose');
  console.log('✅ Mongoose imported');
  
  // Test basic server setup
  const app = express();
  app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
  });
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
    console.log(`Test endpoint: http://localhost:${PORT}/test`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
