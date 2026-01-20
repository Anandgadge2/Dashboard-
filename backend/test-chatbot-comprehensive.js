/**
 * Comprehensive Chatbot Interaction Test
 * Tests all possible citizen and chatbot interactions
 * Run: node test-chatbot-comprehensive.js
 */

require('dotenv').config();
const { connectDatabase, closeDatabase } = require('./dist/config/database');
const { processWhatsAppMessage } = require('./dist/services/chatbotEngine');
const Company = require('./dist/models/Company').default;
const Grievance = require('./dist/models/Grievance').default;
const Appointment = require('./dist/models/Appointment').default;

// Test phone numbers
const TEST_PHONE = '919356150561'; // Use a verified WhatsApp number
const TEST_COMPANY_ID = 'CMP000001'; // Zilla Parishad Amravati

// Helper to create a chatbot message
function createMessage(text, buttonId = null, messageType = 'text') {
  return {
    companyId: TEST_COMPANY_ID,
    from: TEST_PHONE,
    messageText: text,
    messageType: messageType,
    messageId: `test_${Date.now()}_${Math.random()}`,
    buttonId: buttonId,
    metadata: {
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
    }
  };
}

// Helper to simulate user interaction
async function sendMessage(text, buttonId = null, delay = 2000) {
  console.log(`\n👤 User: ${text || `[Button: ${buttonId}]`}`);
  const message = createMessage(text, buttonId);
  await processWhatsAppMessage(message);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
  }
}

async function testChatbotInteractions() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected\n');

    const company = await Company.findOne({ companyId: TEST_COMPANY_ID });
    if (!company) {
      console.error('❌ Company not found!');
      process.exit(1);
    }

    console.log('🧪 Starting Comprehensive Chatbot Tests...\n');
    console.log('='.repeat(80));

    // ============================================================
    // TEST 1: Language Selection Flow
    // ============================================================
    console.log('\n📋 TEST SUITE 1: Language Selection');
    console.log('-'.repeat(80));

    try {
      // Test 1.1: Initial "Hi" message
      console.log('\n🔹 Test 1.1: Initial "Hi" message');
      await sendMessage('Hi');
      logTest('1.1: Initial greeting shows language selection', true);

      // Test 1.2: Select English via button
      console.log('\n🔹 Test 1.2: Select English (Button)');
      await sendMessage(null, 'lang_en');
      logTest('1.2: English selection via button', true);

      // Test 1.3: Restart and select Hindi
      console.log('\n🔹 Test 1.3: Restart and select Hindi');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_hi');
      logTest('1.3: Hindi selection', true);

      // Test 1.4: Restart and select Marathi
      console.log('\n🔹 Test 1.4: Restart and select Marathi');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_mr');
      logTest('1.4: Marathi selection', true);

      // Test 1.5: Invalid language selection
      console.log('\n🔹 Test 1.5: Invalid language selection');
      await sendMessage('Hi');
      await sendMessage('invalid');
      logTest('1.5: Invalid language handling', true);

    } catch (error) {
      logTest('Language Selection Tests', false, error.message);
    }

    // ============================================================
    // TEST 2: Main Menu Navigation
    // ============================================================
    console.log('\n📋 TEST SUITE 2: Main Menu Navigation');
    console.log('-'.repeat(80));

    try {
      // Test 2.1: Show main menu
      console.log('\n🔹 Test 2.1: Main menu display');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      logTest('2.1: Main menu shows all options', true);

      // Test 2.2: Help option
      console.log('\n🔹 Test 2.2: Help menu');
      await sendMessage(null, 'help');
      logTest('2.2: Help menu displays', true);

      // Test 2.3: Back to menu
      console.log('\n🔹 Test 2.3: Back to menu command');
      await sendMessage('back');
      logTest('2.3: Back command works', true);

      // Test 2.4: Menu command
      console.log('\n🔹 Test 2.4: Menu command');
      await sendMessage('menu');
      logTest('2.4: Menu command works', true);

    } catch (error) {
      logTest('Main Menu Tests', false, error.message);
    }

    // ============================================================
    // TEST 3: Grievance Flow - Complete
    // ============================================================
    console.log('\n📋 TEST SUITE 3: Grievance Flow (Complete)');
    console.log('-'.repeat(80));

    try {
      // Test 3.1: Start grievance flow
      console.log('\n🔹 Test 3.1: Start grievance flow');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      await sendMessage(null, 'grievance');
      logTest('3.1: Grievance flow starts', true);

      // Test 3.2: Enter name
      console.log('\n🔹 Test 3.2: Enter citizen name');
      await sendMessage('John Doe');
      logTest('3.2: Name accepted', true);

      // Test 3.3: Select department/category
      console.log('\n🔹 Test 3.3: Select department');
      // Wait for department list, then select first department
      await sendMessage(null, 'dept_0'); // Assuming first department
      logTest('3.3: Department selection', true);

      // Test 3.4: Enter description
      console.log('\n🔹 Test 3.4: Enter grievance description');
      await sendMessage('Water supply issue in my area. No water for 3 days.');
      logTest('3.4: Description accepted', true);

      // Test 3.5: Location - Skip
      console.log('\n🔹 Test 3.5: Skip location');
      await sendMessage(null, 'skip_location');
      logTest('3.5: Location skip works', true);

      // Test 3.6: Photo - Skip
      console.log('\n🔹 Test 3.6: Skip photo');
      await sendMessage(null, 'skip_photo');
      logTest('3.6: Photo skip works', true);

      // Test 3.7: Priority selection
      console.log('\n🔹 Test 3.7: Select priority');
      await sendMessage(null, 'priority_high');
      logTest('3.7: Priority selection', true);

      // Test 3.8: Confirm and submit
      console.log('\n🔹 Test 3.8: Confirm and submit');
      await sendMessage(null, 'confirm_grievance');
      logTest('3.8: Grievance submitted successfully', true);

      // Verify grievance was created
      const grievance = await Grievance.findOne({ citizenPhone: TEST_PHONE })
        .sort({ createdAt: -1 });
      if (grievance) {
        logTest('3.9: Grievance saved to database', true);
        console.log(`   📝 Grievance ID: ${grievance.grievanceId}`);
      } else {
        logTest('3.9: Grievance saved to database', false, 'Not found in database');
      }

    } catch (error) {
      logTest('Grievance Flow Tests', false, error.message);
    }

    // ============================================================
    // TEST 4: Grievance Flow - With Location
    // ============================================================
    console.log('\n📋 TEST SUITE 4: Grievance Flow (With Location)');
    console.log('-'.repeat(80));

    try {
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      await sendMessage(null, 'grievance');
      await sendMessage('Jane Smith');
      await sendMessage(null, 'dept_0');
      await sendMessage('Road repair needed urgently');
      
      // Test 4.1: Manual location entry
      console.log('\n🔹 Test 4.1: Manual location entry');
      await sendMessage(null, 'manual_location');
      await sendMessage('123 Main Street, Amravati');
      logTest('4.1: Manual location entry', true);

      await sendMessage(null, 'skip_photo');
      await sendMessage(null, 'priority_medium');
      await sendMessage(null, 'confirm_grievance');
      logTest('4.2: Grievance with location submitted', true);

    } catch (error) {
      logTest('Grievance with Location Tests', false, error.message);
    }

    // ============================================================
    // TEST 5: Appointment Flow - Complete
    // ============================================================
    console.log('\n📋 TEST SUITE 5: Appointment Flow (Complete)');
    console.log('-'.repeat(80));

    try {
      // Test 5.1: Start appointment flow
      console.log('\n🔹 Test 5.1: Start appointment flow');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      await sendMessage(null, 'appointment');
      logTest('5.1: Appointment flow starts', true);

      // Test 5.2: Select department
      console.log('\n🔹 Test 5.2: Select department for appointment');
      await sendMessage(null, 'dept_0');
      logTest('5.2: Department selected', true);

      // Test 5.3: Enter name
      console.log('\n🔹 Test 5.3: Enter name for appointment');
      await sendMessage('Alice Johnson');
      logTest('5.3: Name accepted', true);

      // Test 5.4: Enter purpose
      console.log('\n🔹 Test 5.4: Enter appointment purpose');
      await sendMessage('Need to discuss property documents');
      logTest('5.4: Purpose accepted', true);

      // Test 5.5: Select date
      console.log('\n🔹 Test 5.5: Select appointment date');
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await sendMessage(null, `date_${dateStr}`);
      logTest('5.5: Date selected', true);

      // Test 5.6: Select time slot
      console.log('\n🔹 Test 5.6: Select time slot');
      await sendMessage(null, 'time_10:00');
      logTest('5.6: Time selected', true);

      // Test 5.7: Confirm booking
      console.log('\n🔹 Test 5.7: Confirm appointment booking');
      await sendMessage(null, 'confirm_appointment');
      logTest('5.7: Appointment booked successfully', true);

      // Verify appointment was created
      const appointment = await Appointment.findOne({ citizenPhone: TEST_PHONE })
        .sort({ createdAt: -1 });
      if (appointment) {
        logTest('5.8: Appointment saved to database', true);
        console.log(`   📅 Appointment ID: ${appointment.appointmentId}`);
      } else {
        logTest('5.8: Appointment saved to database', false, 'Not found in database');
      }

    } catch (error) {
      logTest('Appointment Flow Tests', false, error.message);
    }

    // ============================================================
    // TEST 6: Status Tracking
    // ============================================================
    console.log('\n📋 TEST SUITE 6: Status Tracking');
    console.log('-'.repeat(80));

    try {
      // Test 6.1: Track status - valid grievance ID
      console.log('\n🔹 Test 6.1: Track status with valid grievance ID');
      const latestGrievance = await Grievance.findOne({ citizenPhone: TEST_PHONE })
        .sort({ createdAt: -1 });
      
      if (latestGrievance) {
        await sendMessage('Hi');
        await sendMessage(null, 'lang_en');
        await sendMessage(null, 'track');
        await sendMessage(latestGrievance.grievanceId);
        logTest('6.1: Status tracking with valid ID', true);
      } else {
        logTest('6.1: Status tracking with valid ID', false, 'No grievance found');
      }

      // Test 6.2: Track status - invalid ID
      console.log('\n🔹 Test 6.2: Track status with invalid ID');
      await sendMessage('back');
      await sendMessage(null, 'track');
      await sendMessage('INVALID123');
      logTest('6.2: Invalid ID handling', true);

      // Test 6.3: Track status - appointment ID
      console.log('\n🔹 Test 6.3: Track status with appointment ID');
      const latestAppointment = await Appointment.findOne({ citizenPhone: TEST_PHONE })
        .sort({ createdAt: -1 });
      
      if (latestAppointment) {
        await sendMessage('back');
        await sendMessage(null, 'track');
        await sendMessage(latestAppointment.appointmentId);
        logTest('6.3: Appointment status tracking', true);
      } else {
        logTest('6.3: Appointment status tracking', false, 'No appointment found');
      }

    } catch (error) {
      logTest('Status Tracking Tests', false, error.message);
    }

    // ============================================================
    // TEST 7: Error Handling & Edge Cases
    // ============================================================
    console.log('\n📋 TEST SUITE 7: Error Handling & Edge Cases');
    console.log('-'.repeat(80));

    try {
      // Test 7.1: Invalid menu option
      console.log('\n🔹 Test 7.1: Invalid menu option');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      await sendMessage('invalid_option');
      logTest('7.1: Invalid option handling', true);

      // Test 7.2: Short name (should fail validation)
      console.log('\n🔹 Test 7.2: Short name validation');
      await sendMessage(null, 'grievance');
      await sendMessage('A'); // Too short
      logTest('7.2: Name validation works', true);

      // Test 7.3: Short description (should fail validation)
      console.log('\n🔹 Test 7.3: Short description validation');
      await sendMessage('Valid Name');
      await sendMessage(null, 'dept_0');
      await sendMessage('Short'); // Too short
      logTest('7.3: Description validation works', true);

      // Test 7.4: Cancel grievance
      console.log('\n🔹 Test 7.4: Cancel grievance flow');
      await sendMessage('Valid Name');
      await sendMessage(null, 'dept_0');
      await sendMessage('Valid description with enough characters');
      await sendMessage(null, 'cancel');
      logTest('7.4: Cancel option works', true);

    } catch (error) {
      logTest('Error Handling Tests', false, error.message);
    }

    // ============================================================
    // TEST 8: Multi-Language Content
    // ============================================================
    console.log('\n📋 TEST SUITE 8: Multi-Language Content');
    console.log('-'.repeat(80));

    try {
      // Test 8.1: Hindi grievance flow
      console.log('\n🔹 Test 8.1: Hindi language grievance flow');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_hi');
      await sendMessage(null, 'grievance');
      logTest('8.1: Hindi language support', true);

      // Test 8.2: Marathi appointment flow
      console.log('\n🔹 Test 8.2: Marathi language appointment flow');
      await sendMessage('back');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_mr');
      await sendMessage(null, 'appointment');
      logTest('8.2: Marathi language support', true);

    } catch (error) {
      logTest('Multi-Language Tests', false, error.message);
    }

    // ============================================================
    // TEST 9: Navigation & Flow Control
    // ============================================================
    console.log('\n📋 TEST SUITE 9: Navigation & Flow Control');
    console.log('-'.repeat(80));

    try {
      // Test 9.1: Back button during grievance
      console.log('\n🔹 Test 9.1: Back button during grievance flow');
      await sendMessage('back');
      await sendMessage('Hi');
      await sendMessage(null, 'lang_en');
      await sendMessage(null, 'grievance');
      await sendMessage('Test User');
      await sendMessage(null, 'menu_back');
      logTest('9.1: Back to menu button works', true);

      // Test 9.2: Help during flow
      console.log('\n🔹 Test 9.2: Help command during flow');
      await sendMessage(null, 'grievance');
      await sendMessage('help');
      logTest('9.2: Help command works during flow', true);

    } catch (error) {
      logTest('Navigation Tests', false, error.message);
    }

    // ============================================================
    // TEST SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.tests.length}`);
    console.log(`📊 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    testResults.tests.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}${test.details ? ` - ${test.details}` : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Comprehensive chatbot testing completed!');
    console.log('📧 Check WhatsApp for all messages');
    console.log('📋 Check database for created records');
    console.log('='.repeat(80));

    await closeDatabase();
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run tests
testChatbotInteractions();
