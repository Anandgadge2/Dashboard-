const http = require('http');

const testData = {
  name: 'Test Company Simple',
  companyType: 'GOVERNMENT',
  contactEmail: 'testsimple@example.com',
  contactPhone: '+1234567890',
  address: 'Test Address',
  enabledModules: ['GRIEVANCE'],
  admin: {
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    phone: '+1234567890'
  }
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/companies',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', response);
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
