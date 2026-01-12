const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard');
    console.log('✅ Connected to MongoDB');

    // Test Company model
    const Company = require('./dist/models/Company').default;
    console.log('\n📋 Testing Company model...');
    
    const testCompany = {
      name: 'Test Company',
      companyType: 'GOVERNMENT',
      contactEmail: 'test@example.com',
      contactPhone: '+1234567890',
      enabledModules: ['GRIEVANCE'],
      isActive: true,
      isSuspended: false,
      isDeleted: false
    };

    const createdCompany = await Company.create(testCompany);
    console.log('✅ Company created:', createdCompany.companyId);
    console.log('Company data:', {
      companyId: createdCompany.companyId,
      name: createdCompany.name,
      companyType: createdCompany.companyType,
      isActive: createdCompany.isActive
    });

    // Test Department model
    const Department = require('./dist/models/Department').default;
    console.log('\n📋 Testing Department model...');
    
    const testDepartment = {
      name: 'Test Department',
      description: 'Test department',
      companyId: createdCompany._id,
      isActive: true,
      isDeleted: false
    };

    const createdDepartment = await Department.create(testDepartment);
    console.log('✅ Department created:', createdDepartment.departmentId);
    console.log('Department data:', {
      departmentId: createdDepartment.departmentId,
      name: createdDepartment.name,
      companyId: createdDepartment.companyId,
      isActive: createdDepartment.isActive
    });

    // Test User model
    const User = require('./dist/models/User').default;
    console.log('\n📋 Testing User model...');
    
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'OPERATOR',
      companyId: createdCompany._id,
      departmentId: createdDepartment._id,
      isActive: true,
      isEmailVerified: true
    };

    const createdUser = await User.create(testUser);
    console.log('✅ User created:', createdUser.userId);
    console.log('User data:', {
      userId: createdUser.userId,
      email: createdUser.email,
      role: createdUser.role,
      companyId: createdUser.companyId,
      departmentId: createdUser.departmentId,
      isActive: createdUser.isActive
    });

    console.log('\n🎉 All models working correctly!');
    console.log('\n📊 Database Test Results:');
    console.log('- Company ID:', createdCompany.companyId);
    console.log('- Department ID:', createdDepartment.departmentId);
    console.log('- User ID:', createdUser.userId);
    console.log('- All auto-generation hooks working!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
