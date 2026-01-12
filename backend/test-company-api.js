const axios = require('axios');

async function testCompanyCreation() {
  try {
    console.log('Testing company creation...');
    
    const companyData = {
      name: 'Test Company API',
      companyType: 'GOVERNMENT',
      contactEmail: 'testapi@example.com',
      contactPhone: '+1234567890',
      address: 'Test Address',
      enabledModules: ['GRIEVANCE', 'APPOINTMENT'],
      admin: {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        password: 'password123',
        phone: '+1234567890'
      }
    };

    const response = await axios.post('http://localhost:5000/api/companies', companyData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('✅ Company creation successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Company creation failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCompanyCreation();
