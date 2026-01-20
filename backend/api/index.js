// Vercel serverless function wrapper for Express app
// The compiled server.js exports the app as default
let app;

try {
  // Try default export first (ES modules compiled to CommonJS)
  app = require('../dist/server.js').default;
} catch (e) {
  // Fallback to direct require if default doesn't exist
  app = require('../dist/server.js');
}

// If app is still undefined, try module.exports.default
if (!app) {
  const serverModule = require('../dist/server.js');
  app = serverModule.default || serverModule;
}

// Export as serverless function
module.exports = app;
