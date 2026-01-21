/**
 * Test Email Notifications for Assignment and Status Changes
 * 
 * This script tests:
 * 1. Email sent when assigning grievance/appointment
 * 2. Email sent when status changes (especially to RESOLVED)
 * 
 * Run: node test-email-assignment-status.js
 * 
 * Prerequisites:
 * - Backend must be built: npm run build
 * - .env file must have SMTP credentials
 * - Database must be running and accessible
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import compiled services
const { sendEmail, generateNotificationEmail } = require('./dist/services/emailService');
const { 
  notifyUserOnAssignment, 
  notifyCitizenOnResolution,
  notifyHierarchyOnStatusChange 
} = require('./dist/services/notificationService');

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function testAssignmentEmail() {
  console.log('='.repeat(60));
  console.log('📧 TEST 1: Assignment Email Notification');
  console.log('='.repeat(60));
  
  // You need to replace these with actual IDs from your database
  // Or create test data first
  const testData = {
    type: 'grievance',
    action: 'assigned',
    grievanceId: 'GRV00000001',
    citizenName: 'Test Citizen',
    citizenPhone: '919356150561',
    citizenWhatsApp: '919356150561',
    departmentId: null, // Will be fetched from user
    companyId: null, // Will be fetched from user
    description: 'Test grievance for email testing - Water supply issue',
    category: 'Water Supply',
    priority: 'HIGH',
    location: 'Test Location, Amravati',
    assignedTo: null, // Replace with actual user ID
    assignedByName: 'Test Admin'
  };

  console.log('\n⚠️  Note: This test requires:');
  console.log('   1. Valid user ID in assignedTo field');
  console.log('   2. Valid companyId and departmentId');
  console.log('   3. User must have an email address\n');

  // Option 1: Test with mock data (email template only)
  console.log('📝 Testing email template generation...');
  const emailTemplate = generateNotificationEmail('grievance', 'assigned', {
    companyName: 'Zilla Parishad Amravati',
    recipientName: 'Test Operator',
    grievanceId: testData.grievanceId,
    citizenName: testData.citizenName,
    citizenPhone: testData.citizenPhone,
    departmentName: 'Water Supply Department',
    category: testData.category,
    priority: testData.priority,
    description: testData.description,
    location: testData.location,
    assignedByName: testData.assignedByName
  });

  console.log('✅ Email template generated:');
  console.log(`   Subject: ${emailTemplate.subject}`);
  console.log(`   To: ${process.env.SMTP_USER} (your test email)`);
  
  // Send test email
  const result = await sendEmail(
    process.env.SMTP_USER, // Send to yourself for testing
    emailTemplate.subject,
    emailTemplate.html,
    emailTemplate.text
  );

  if (result.success) {
    console.log('✅ Assignment email sent successfully!');
    console.log('📧 Check your email inbox');
  } else {
    console.error('❌ Failed to send email:', result.error);
  }

  console.log('\n');
}

async function testStatusChangeEmail() {
  console.log('='.repeat(60));
  console.log('📧 TEST 2: Status Change Email Notification');
  console.log('='.repeat(60));

  // Test grievance resolved email
  console.log('\n📝 Testing grievance resolved email...');
  const resolvedTemplate = generateNotificationEmail('grievance', 'resolved', {
    companyName: 'Zilla Parishad Amravati',
    citizenName: 'Test Citizen',
    grievanceId: 'GRV00000001',
    departmentName: 'Water Supply Department',
    remarks: 'Issue has been resolved successfully. Water supply has been restored to the area. Thank you for your patience.'
  });

  console.log('✅ Email template generated:');
  console.log(`   Subject: ${resolvedTemplate.subject}`);
  console.log(`   To: ${process.env.SMTP_USER} (your test email)`);

  const result = await sendEmail(
    process.env.SMTP_USER,
    resolvedTemplate.subject,
    resolvedTemplate.html,
    resolvedTemplate.text
  );

  if (result.success) {
    console.log('✅ Status change email sent successfully!');
    console.log('📧 Check your email inbox');
  } else {
    console.error('❌ Failed to send email:', result.error);
  }

  console.log('\n');
}

async function testWithRealData() {
  console.log('='.repeat(60));
  console.log('📧 TEST 3: Real Database Test (Optional)');
  console.log('='.repeat(60));
  
  console.log('\n⚠️  To test with real data:');
  console.log('   1. Make sure you have:');
  console.log('      - A grievance/appointment in database');
  console.log('      - A user with email address');
  console.log('      - Valid IDs\n');
  console.log('   2. Update the script with real IDs');
  console.log('   3. Uncomment the testWithRealData() call\n');
  
  // Example with real data (uncomment and fill in):
  /*
  try {
    const Grievance = require('./dist/models/Grievance').default;
    const User = require('./dist/models/User').default;
    
    // Get a real grievance
    const grievance = await Grievance.findOne({ status: 'PENDING' });
    if (!grievance) {
      console.log('⚠️  No pending grievances found');
      return;
    }
    
    // Get a real user
    const user = await User.findOne({ email: { $exists: true, $ne: '' } });
    if (!user) {
      console.log('⚠️  No user with email found');
      return;
    }
    
    console.log(`📋 Testing with grievance: ${grievance.grievanceId}`);
    console.log(`👤 Testing with user: ${user.email}\n`);
    
    // Test assignment notification
    await notifyUserOnAssignment({
      type: 'grievance',
      action: 'assigned',
      grievanceId: grievance.grievanceId,
      citizenName: grievance.citizenName,
      citizenPhone: grievance.citizenPhone,
      departmentId: grievance.departmentId,
      companyId: grievance.companyId,
      description: grievance.description,
      category: grievance.category,
      priority: grievance.priority,
      assignedTo: user._id,
      assignedByName: 'Test Admin'
    });
    
    console.log('✅ Real assignment notification sent!\n');
    
  } catch (error) {
    console.error('❌ Error testing with real data:', error.message);
  }
  */
}

async function runTests() {
  console.log('\n🚀 Starting Email Notification Tests\n');
  console.log('SMTP Configuration:');
  console.log(`  Host: ${process.env.SMTP_HOST}`);
  console.log(`  Port: ${process.env.SMTP_PORT}`);
  console.log(`  User: ${process.env.SMTP_USER}`);
  console.log(`  From: ${process.env.SMTP_FROM_NAME}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not configured in .env');
    console.error('   Please add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    process.exit(1);
  }

  await connectDB();

  // Test 1: Assignment email
  await testAssignmentEmail();

  // Test 2: Status change email
  await testStatusChangeEmail();

  // Test 3: Real data (optional)
  await testWithRealData();

  console.log('='.repeat(60));
  console.log('✅ All email tests completed!');
  console.log('='.repeat(60));
  console.log('\n📧 Check your email inbox:');
  console.log(`   ${process.env.SMTP_USER}`);
  console.log('\n🌐 If using Ethereal Email:');
  console.log('   https://ethereal.email');
  console.log(`   Login: ${process.env.SMTP_USER}`);
  console.log(`   Password: ${process.env.SMTP_PASS}\n`);

  await mongoose.connection.close();
  process.exit(0);
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
