console.log('Testing model imports...');

try {
  // Test if we can import the models
  const Company = require('./src/models/Company.ts');
  console.log('✅ Company model imported');
  
  const User = require('./src/models/User.ts');
  console.log('✅ User model imported');
  
  console.log('Models loaded successfully');
} catch (error) {
  console.error('❌ Error importing models:', error.message);
  console.error('Stack:', error.stack);
}
