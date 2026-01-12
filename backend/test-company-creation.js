const mongoose = require('mongoose');
require('dotenv').config();

// Test database connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in .env file');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');

    // Test Company model
    const Company = require('./dist/models/Company').default;
    console.log('Testing Company model...');
    
    const testCompany = {
      name: 'Test Company',
      companyType: 'GOVERNMENT',
      contactEmail: 'test@example.com',
      contactPhone: '+1234567890',
      address: 'Test Address',
      enabledModules: [],
      theme: {
        primaryColor: '#0f4c81',
        secondaryColor: '#1a73e8'
      },
      isActive: true,
      isSuspended: false,
      isDeleted: false
    };

    const company = await Company.create(testCompany);
    console.log('✅ Company created successfully:', company._id);
    
    // Clean up
    await Company.findByIdAndDelete(company._id);
    console.log('✅ Test company cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
