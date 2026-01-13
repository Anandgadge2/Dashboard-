// Enhanced Enterprise-Level Government Chatbot Engine
// Features: Professional language, button-based interactions, voice note support
import Company from '../models/Company';
import Department from '../models/Department';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import { GrievanceStatus, AppointmentStatus } from '../config/constants';
import { sendWhatsAppMessage, sendWhatsAppButtons, sendWhatsAppList } from './whatsappService';
import { sendOTP, verifyOTP, isPhoneVerified } from './otpService';
import { findDepartmentByCategory, getAvailableCategories } from './departmentMapper';
import { transcribeWhatsAppVoice, isTranscriptionConfigured } from './voiceTranscriptionService';

export interface ChatbotMessage {
  companyId: string;
  from: string;
  messageText: string;
  messageType: string;
  messageId: string;
  mediaUrl?: string;
  metadata?: any;
  buttonId?: string;
}

interface UserSession {
  companyId: string;
  phoneNumber: string;
  language: 'en' | 'hi' | 'mr';
  step: string;
  data: Record<string, any>;
  pendingAction?: string;
  lastActivity: Date;
}

const userSessions: Map<string, UserSession> = new Map();

// Professional Government Language Translations
const translations = {
  en: {
    welcome: '🏛️ *Welcome to Zilla Parishad Digital Services*\n\nWe are committed to providing efficient and transparent government services to all citizens.\n\nPlease select your preferred language to continue:',
    serviceUnavailable: '⚠️ *Service Temporarily Unavailable*\n\nWe apologize for the inconvenience. Our services are currently under maintenance. Please try again later or contact our helpdesk.\n\nThank you for your patience.',
    mainMenu: '📋 *Government Services Portal*\n\n*Available Services:*\n\nPlease select the service you wish to access:',
    grievanceRaise: '📝 *Grievance Registration*\n\nWe take all citizen complaints seriously and ensure timely resolution.\n\nTo proceed, please provide the following information:',
    appointmentBook: '📅 *Appointment Booking*\n\nSchedule an appointment with government departments for in-person services.\n\nPlease select a department:',
    trackStatus: '🔍 *Status Tracking*\n\nTrack the status of your registered grievances or appointments.\n\nPlease enter your reference number:',
    otpSent: '🔐 *Verification Code Sent*\n\nFor security purposes, we have sent a 6-digit verification code to your registered mobile number.\n\n*Code:* {otp}\n\n*Validity:* 10 minutes\n\nPlease enter the code to continue.',
    otpVerified: '✅ *Verification Successful*\n\nYour identity has been verified. You may now proceed with the service.',
    otpInvalid: '❌ *Invalid Verification Code*\n\nThe code you entered is incorrect or has expired.\n\nPlease try again or request a new code.',
    grievanceName: '👤 *Citizen Information*\n\nPlease provide your full name as per official documents:',
    grievanceCategory: '📂 *Complaint Category*\n\nPlease select the category that best describes your complaint:',
    grievanceDescription: '📝 *Complaint Details*\n\nPlease provide a detailed description of your complaint:\n\n*Guidelines:*\n• Be specific and clear\n• Include relevant dates and locations\n• Mention any previous attempts to resolve',
    grievanceLocation: '📍 *Location Information*\n\nPlease share the location or address related to your complaint:\n\n*Options:*\n• Type your address\n• Share your location\n• Type "SKIP" to continue without location',
    grievancePhoto: '📷 *Supporting Documents*\n\nYou may upload photos or documents to support your complaint:\n\n*Options:*\n• Send photo/document\n• Type "SKIP" to continue without media',
    grievancePriority: '⚡ *Priority Level*\n\nPlease select the urgency level of your complaint:',
    grievanceConfirm: '📋 *Review Your Complaint*\n\nPlease review the details before submission:\n\n*Name:* {name}\n*Category:* {category}\n*Priority:* {priority}\n*Description:* {description}\n\nIs this information correct?',
    grievanceSuccess: '✅ *Grievance Registered Successfully*\n\n*Reference Number:* {id}\n*Category:* {category}\n*Department:* {department}\n*Status:* Under Review\n\nYou will receive regular updates on the status of your complaint.\n\nThank you for using our services.',
    grievanceError: '❌ *Registration Failed*\n\nWe encountered an error while processing your complaint. Please try again or contact our helpdesk.\n\nWe apologize for the inconvenience.',
    voiceReceived: '🎤 *Voice Message Received*\n\nWe are processing your voice message. Please wait...',
    voiceProcessing: '🔄 *Processing Voice Message*\n\nYour voice message is being transcribed. This may take a few moments.',
    voiceError: '❌ *Voice Processing Failed*\n\nWe were unable to process your voice message. Please try typing your message or try again later.',
    backToMenu: '↩️ *Return to Main Menu*',
    help: 'ℹ️ *Help & Support*\n\nFor assistance, please:\n• Contact our helpdesk\n• Visit our office\n• Check our website\n\n*Office Hours:* 9:00 AM - 6:00 PM\n*Working Days:* Monday to Saturday',
    invalidOption: '❌ *Invalid Selection*\n\nPlease select from the available options using the buttons provided.',
    sessionExpired: '⏰ *Session Expired*\n\nYour session has expired due to inactivity. Please start again by sending "HI" or "START".'
  },
  hi: {
    welcome: '🏛️ *जिला परिषद डिजिटल सेवाओं में आपका स्वागत है*\n\nहम सभी नागरिकों को कुशल और पारदर्शी सरकारी सेवाएं प्रदान करने के लिए प्रतिबद्ध हैं।\n\nकृपया जारी रखने के लिए अपनी पसंदीदा भाषा चुनें:',
    mainMenu: '📋 *सरकारी सेवा पोर्टल*\n\n*उपलब्ध सेवाएं:*\n\nकृपया वह सेवा चुनें जिसे आप एक्सेस करना चाहते हैं:',
    grievanceRaise: '📝 *शिकायत पंजीकरण*\n\nहम सभी नागरिक शिकायतों को गंभीरता से लेते हैं और समय पर समाधान सुनिश्चित करते हैं।',
    voiceReceived: '🎤 *वॉइस मैसेज प्राप्त हुआ*\n\nहम आपके वॉइस मैसेज को प्रोसेस कर रहे हैं। कृपया प्रतीक्षा करें...',
    backToMenu: '↩️ *मुख्य मेनू पर वापस जाएं*'
  },
  mr: {
    welcome: '🏛️ *जिल्हा परिषद डिजिटल सेवांमध्ये आपले स्वागत आहे*\n\nआम्ही सर्व नागरिकांना कार्यक्षम आणि पारदर्शक सरकारी सेवा प्रदान करण्यासाठी वचनबद्ध आहोत।\n\nकृपया पुढे जाण्यासाठी आपली पसंतीची भाषा निवडा:',
    mainMenu: '📋 *सरकारी सेवा पोर्टल*\n\n*उपलब्ध सेवा:*\n\nकृपया आपण प्रवेश करू इच्छित सेवा निवडा:',
    grievanceRaise: '📝 *तक्रार नोंदणी*\n\nआम्ही सर्व नागरिक तक्रारींना गंभीरपणे घेतो आणि वेळेवर निराकरण सुनिश्चित करतो।',
    voiceReceived: '🎤 *व्हॉइस मेसेज प्राप्त झाले*\n\nआम्ही आपला व्हॉइस मेसेज प्रक्रिया करत आहोत. कृपया प्रतीक्षा करा...',
    backToMenu: '↩️ *मुख्य मेनूवर परत जा*'
  }
};

function getTranslation(key: string, language: 'en' | 'hi' | 'mr' = 'en'): string {
  const langData = translations[language] as any;
  const enData = translations.en as any;
  return langData?.[key] || enData[key] || key;
}

// Helper to get or create session
function getSession(phoneNumber: string, companyId: string): UserSession {
  const sessionKey = `${phoneNumber}_${companyId}`;
  let session = userSessions.get(sessionKey);
  
  if (!session) {
    session = {
      companyId,
      phoneNumber,
      language: 'en',
      step: 'start',
      data: {},
      lastActivity: new Date()
    };
    userSessions.set(sessionKey, session);
  }
  
  // Check if session expired (30 minutes of inactivity)
  const inactivityTime = Date.now() - session.lastActivity.getTime();
  if (inactivityTime > 30 * 60 * 1000) {
    userSessions.delete(sessionKey);
    return getSession(phoneNumber, companyId); // Create new session
  }
  
  session.lastActivity = new Date();
  return session;
}

async function updateSession(session: UserSession) {
  const sessionKey = `${session.phoneNumber}_${session.companyId}`;
  userSessions.set(sessionKey, session);
}

async function clearSession(phoneNumber: string, companyId: string) {
  const sessionKey = `${phoneNumber}_${companyId}`;
  userSessions.delete(sessionKey);
}

// Main message processor with voice note support
export async function processWhatsAppMessage(message: ChatbotMessage): Promise<any> {
  const { companyId, from, messageText, messageType, mediaUrl, buttonId, metadata } = message;

  const company = await Company.findById(companyId);
  if (!company) {
    console.error('❌ Company not found:', companyId);
    return;
  }

  const session = getSession(from, companyId);
  let userInput = (buttonId || messageText || '').trim().toLowerCase();

  // Handle voice notes/audio messages
  if (messageType === 'audio' && mediaUrl && isTranscriptionConfigured()) {
    await sendWhatsAppMessage(company, from, getTranslation('voiceReceived', session.language));
    
    try {
      const transcription = await transcribeWhatsAppVoice(
        mediaUrl,
        company.whatsappConfig?.accessToken || '', // Handle possible undefined
        session.language
      );
      
      if (transcription.success && transcription.text) {
        userInput = transcription.text.trim().toLowerCase();
        await sendWhatsAppMessage(
          company,
          from,
          `✅ *Voice Message Processed*\n\n"${transcription.text}"\n\nProcessing your request...`
        );
      } else {
        await sendWhatsAppMessage(company, from, getTranslation('voiceError', session.language));
        return;
      }
    } catch (error: any) {
      console.error('❌ Voice transcription error:', error);
      await sendWhatsAppMessage(company, from, getTranslation('voiceError', session.language));
      return;
    }
  } else if (messageType === 'audio' && !isTranscriptionConfigured()) {
    await sendWhatsAppMessage(
      company,
      from,
      '🎤 *Voice Message Received*\n\nWe received your voice message. For better assistance, please type your message or use the buttons provided.\n\nThank you for your understanding.'
    );
    return;
  }

  console.log('🔄 Processing message:', { from, step: session.step, input: userInput, type: messageType });

  // Initial greeting - auto-trigger on any message if session is at start
  if (session.step === 'start') {
    if (userInput === 'hi' || userInput === 'hello' || userInput === 'start' || userInput === 'namaste' || userInput === 'नमस्ते') {
      await showLanguageSelection(session, message, company);
      return;
    } else {
      // Auto-start on any message
      await showLanguageSelection(session, message, company);
      return;
    }
  }

  // Language selection
  if (session.step === 'language_selection') {
    if (userInput === 'english' || buttonId === 'lang_en' || userInput === '1') {
      session.language = 'en';
      await showMainMenu(session, message, company);
    } else if (userInput === 'hindi' || buttonId === 'lang_hi' || userInput === '2' || userInput === 'हिंदी') {
      session.language = 'hi';
      await showMainMenu(session, message, company);
    } else if (userInput === 'marathi' || buttonId === 'lang_mr' || userInput === '3' || userInput === 'मराठी') {
      session.language = 'mr';
      await showMainMenu(session, message, company);
    } else {
      await sendWhatsAppMessage(company, from, getTranslation('invalidOption', session.language));
      await showLanguageSelection(session, message, company);
    }
    return;
  }

  // Handle "back" or "menu" commands
  if (userInput === 'back' || userInput === 'menu' || userInput === 'main menu' || buttonId === 'back_menu') {
    await showMainMenu(session, message, company);
    return;
  }

  // Handle "help" command
  if (userInput === 'help' || buttonId === 'help') {
    await sendWhatsAppMessage(company, from, getTranslation('help', session.language));
    await showMainMenu(session, message, company);
    return;
  }

  // Main menu handling
  if (session.step === 'main_menu') {
    await handleMainMenuSelection(session, message, company, buttonId || userInput);
    return;
  }

  // OTP verification
  if (session.step === 'otp_verification') {
    const isValid = await verifyOTP(from, userInput);
    if (isValid) {
      await sendWhatsAppMessage(company, from, getTranslation('otpVerified', session.language));
      if (session.pendingAction === 'grievance') {
        await startGrievanceFlow(session, message, company);
      } else if (session.pendingAction === 'appointment') {
        await startAppointmentFlow(session, message, company);
      }
    } else {
      await sendWhatsAppButtons(
        company,
        from,
        getTranslation('otpInvalid', session.language) + '\n\n' + getTranslation('backToMenu', session.language),
        [
          { id: 'resend_otp', title: '🔄 Resend OTP' },
          { id: 'back_menu', title: '↩️ Main Menu' }
        ]
      );
    }
    return;
  }

  // Grievance flow
  if (session.step.startsWith('grievance_')) {
    await continueGrievanceFlow(session, userInput, message, company);
    return;
  }

  // Appointment flow
  if (session.step.startsWith('appointment_')) {
    await continueAppointmentFlow(session, userInput, message, company);
    return;
  }

  // Track status flow
  if (session.step === 'track_status') {
    await handleStatusTracking(session, userInput, message, company);
    return;
  }

  // Default: show main menu
  await showMainMenu(session, message, company);
}

// Show language selection with professional greeting
async function showLanguageSelection(session: UserSession, message: ChatbotMessage, company: any) {
  if (!company.enabledModules || company.enabledModules.length === 0) {
    await sendWhatsAppMessage(company, message.from, getTranslation('serviceUnavailable', session.language));
    await clearSession(message.from, company._id.toString());
    return;
  }

  await sendWhatsAppButtons(
    company,
    message.from,
    getTranslation('welcome', session.language),
    [
      { id: 'lang_en', title: '🇬🇧 English' },
      { id: 'lang_hi', title: '🇮🇳 हिंदी' },
      { id: 'lang_mr', title: '🇮🇳 मराठी' }
    ]
  );
  session.step = 'language_selection';
  await updateSession(session);
}

// Show main menu with all available services
async function showMainMenu(session: UserSession, message: ChatbotMessage, company: any) {
  const buttons = [];
  
  if (company.enabledModules.includes('GRIEVANCE')) {
    buttons.push({ id: 'grievance', title: '📝 Raise Grievance' });
  }
  
  if (company.enabledModules.includes('APPOINTMENT')) {
    buttons.push({ id: 'appointment', title: '📅 Book Appointment' });
  }
  
  if (buttons.length > 0) {
    buttons.push({ id: 'track', title: '🔍 Track Status' });
  }

  buttons.push({ id: 'help', title: 'ℹ️ Help & Support' });

  if (buttons.length === 0) {
    await sendWhatsAppMessage(company, message.from, getTranslation('serviceUnavailable', session.language));
    await clearSession(message.from, company._id.toString());
    return;
  }

  await sendWhatsAppButtons(
    company,
    message.from,
    getTranslation('mainMenu', session.language),
    buttons
  );

  session.step = 'main_menu';
  await updateSession(session);
}

// Handle main menu selection
async function handleMainMenuSelection(
  session: UserSession,
  message: ChatbotMessage,
  company: any,
  selection: string
) {
  switch (selection) {
    case 'grievance':
      if (!company.enabledModules.includes('GRIEVANCE')) {
        await sendWhatsAppMessage(company, message.from, getTranslation('serviceUnavailable', session.language));
        await showMainMenu(session, message, company);
        return;
      }
      
      if (!await isPhoneVerified(message.from)) {
        await sendOTP(company, message.from, session.language);
        session.step = 'otp_verification';
        session.pendingAction = 'grievance';
        await updateSession(session);
      } else {
        await startGrievanceFlow(session, message, company);
      }
      break;

    case 'appointment':
      if (!company.enabledModules.includes('APPOINTMENT')) {
        await sendWhatsAppMessage(company, message.from, getTranslation('serviceUnavailable', session.language));
        await showMainMenu(session, message, company);
        return;
      }
      
      if (!await isPhoneVerified(message.from)) {
        await sendOTP(company, message.from, session.language);
        session.step = 'otp_verification';
        session.pendingAction = 'appointment';
        await updateSession(session);
      } else {
        await startAppointmentFlow(session, message, company);
      }
      break;

    case 'track':
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('trackStatus', session.language)
      );
      session.step = 'track_status';
      await updateSession(session);
      break;

    case 'help':
      await sendWhatsAppMessage(company, message.from, getTranslation('help', session.language));
      await showMainMenu(session, message, company);
      break;

    default:
      await sendWhatsAppMessage(company, message.from, getTranslation('invalidOption', session.language));
      await showMainMenu(session, message, company);
  }
}

// Start grievance flow with button-based interactions
async function startGrievanceFlow(session: UserSession, message: ChatbotMessage, company: any) {
  await sendWhatsAppMessage(
    company,
    message.from,
    getTranslation('grievanceRaise', session.language)
  );
  
  await sendWhatsAppMessage(
    company,
    message.from,
    getTranslation('grievanceName', session.language)
  );
  
  session.step = 'grievance_name';
  session.data = {};
  await updateSession(session);
}

// Continue grievance flow with enhanced button interactions
async function continueGrievanceFlow(
  session: UserSession,
  userInput: string,
  message: ChatbotMessage,
  company: any
) {
  const { buttonId } = message;
  switch (session.step) {
    case 'grievance_name':
      if (!userInput || userInput.length < 2) {
        await sendWhatsAppMessage(
          company,
          message.from,
          '⚠️ *Invalid Name*\n\nPlease enter a valid name (minimum 2 characters).'
        );
        return;
      }
      session.data.citizenName = userInput;
      
      // Get categories and show as buttons
      const categories = await getAvailableCategories(company._id);
      if (categories.length > 0) {
        const categoryButtons = categories.slice(0, 3).map((cat, idx) => ({
          id: `cat_${cat}`,
          title: `${cat.charAt(0).toUpperCase() + cat.slice(1)}`
        }));
        
        // If more than 3 categories, use list
        if (categories.length > 3) {
          const sections = [{
            title: 'Select Category',
            rows: categories.map((cat, idx) => ({
              id: `cat_${cat}`,
              title: cat.charAt(0).toUpperCase() + cat.slice(1),
              description: `Category ${idx + 1}`
            }))
          }];
          
          await sendWhatsAppList(
            company,
            message.from,
            getTranslation('grievanceCategory', session.language),
            'Select Category',
            sections
          );
        } else {
          await sendWhatsAppButtons(
            company,
            message.from,
            getTranslation('grievanceCategory', session.language),
            categoryButtons
          );
        }
      } else {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('grievanceCategory', session.language) + '\n\nPlease type your category:'
        );
      }
      
      session.step = 'grievance_category';
      await updateSession(session);
      break;

    case 'grievance_category':
      let category = userInput.replace('cat_', '').trim();
      if (!category || category === '') {
        category = 'General';
      }
      session.data.category = category;
      
      // Show priority selection with buttons
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievancePriority', session.language),
        [
          { id: 'priority_low', title: '🟢 Low' },
          { id: 'priority_medium', title: '🟡 Medium' },
          { id: 'priority_high', title: '🔴 High' }
        ]
      );
      
      session.step = 'grievance_priority';
      await updateSession(session);
      break;

    case 'grievance_priority':
      let priority = 'MEDIUM';
      if (userInput.includes('low') || buttonId === 'priority_low') {
        priority = 'LOW';
      } else if (userInput.includes('high') || buttonId === 'priority_high') {
        priority = 'HIGH';
      } else if (userInput.includes('urgent')) {
        priority = 'URGENT';
      }
      session.data.priority = priority;
      
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('grievanceDescription', session.language)
      );
      session.step = 'grievance_description';
      await updateSession(session);
      break;

    case 'grievance_description':
      if (!userInput || userInput.length < 10) {
        await sendWhatsAppMessage(
          company,
          message.from,
          '⚠️ *Description Too Short*\n\nPlease provide a detailed description (minimum 10 characters).'
        );
        return;
      }
      session.data.description = userInput;
      
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievanceLocation', session.language),
        [
          { id: 'location_skip', title: '⏭️ Skip Location' },
          { id: 'location_manual', title: '✍️ Type Address' }
        ]
      );
      
      session.step = 'grievance_location';
      await updateSession(session);
      break;

    case 'grievance_location':
      if (buttonId === 'location_skip' || userInput === 'skip') {
        session.data.address = undefined;
      } else if (buttonId === 'location_manual') {
        await sendWhatsAppMessage(
          company,
          message.from,
          '📍 Please type your address:'
        );
        session.step = 'grievance_location_input';
        await updateSession(session);
        return;
      } else {
        session.data.address = userInput;
      }
      
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievancePhoto', session.language),
        [
          { id: 'photo_skip', title: '⏭️ Skip Photo' },
          { id: 'photo_upload', title: '📷 Upload Photo' }
        ]
      );
      
      session.step = 'grievance_photo';
      await updateSession(session);
      break;

    case 'grievance_location_input':
      session.data.address = userInput;
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievancePhoto', session.language),
        [
          { id: 'photo_skip', title: '⏭️ Skip Photo' },
          { id: 'photo_upload', title: '📷 Upload Photo' }
        ]
      );
      session.step = 'grievance_photo';
      await updateSession(session);
      break;

    case 'grievance_photo':
      if (buttonId === 'photo_skip' || userInput === 'skip') {
        session.data.media = [];
      } else if (message.mediaUrl && (message.messageType === 'image' || message.messageType === 'document')) {
        session.data.media = [{ url: message.mediaUrl, type: message.messageType, uploadedAt: new Date() }];
      } else if (buttonId === 'photo_upload') {
        await sendWhatsAppMessage(
          company,
          message.from,
          '📷 Please send your photo or document now:'
        );
        session.step = 'grievance_photo_upload';
        await updateSession(session);
        return;
      }
      
      // Show confirmation with buttons
      const confirmMessage = getTranslation('grievanceConfirm', session.language)
        .replace('{name}', session.data.citizenName)
        .replace('{category}', session.data.category)
        .replace('{priority}', session.data.priority)
        .replace('{description}', session.data.description.substring(0, 100) + '...');
      
      await sendWhatsAppButtons(
        company,
        message.from,
        confirmMessage,
        [
          { id: 'confirm_yes', title: '✅ Confirm & Submit' },
          { id: 'confirm_no', title: '❌ Cancel' }
        ]
      );
      
      session.step = 'grievance_confirm';
      await updateSession(session);
      break;

    case 'grievance_photo_upload':
      if (message.mediaUrl && (message.messageType === 'image' || message.messageType === 'document')) {
        session.data.media = [{ url: message.mediaUrl, type: message.messageType, uploadedAt: new Date() }];
      }
      
      const confirmMsg = getTranslation('grievanceConfirm', session.language)
        .replace('{name}', session.data.citizenName)
        .replace('{category}', session.data.category)
        .replace('{priority}', session.data.priority)
        .replace('{description}', session.data.description.substring(0, 100) + '...');
      
      await sendWhatsAppButtons(
        company,
        message.from,
        confirmMsg,
        [
          { id: 'confirm_yes', title: '✅ Confirm & Submit' },
          { id: 'confirm_no', title: '❌ Cancel' }
        ]
      );
      
      session.step = 'grievance_confirm';
      await updateSession(session);
      break;

    case 'grievance_confirm':
      if (buttonId === 'confirm_yes' || userInput === 'yes' || userInput === 'confirm') {
        await createGrievanceWithDepartment(session, message, company);
      } else {
        await sendWhatsAppMessage(
          company,
          message.from,
          '❌ *Registration Cancelled*\n\nYour grievance registration has been cancelled.'
        );
        await showMainMenu(session, message, company);
      }
      break;
  }
}

// Create grievance with automatic department routing
async function createGrievanceWithDepartment(
  session: UserSession,
  message: ChatbotMessage,
  company: any
) {
  try {
    const departmentId = await findDepartmentByCategory(company._id, session.data.category);
    
    const grievanceData = {
      companyId: company._id,
      departmentId: departmentId || undefined,
      citizenName: session.data.citizenName,
      citizenPhone: message.from,
      citizenWhatsApp: message.from,
      description: session.data.description,
      category: session.data.category,
      priority: session.data.priority || 'MEDIUM',
      location: session.data.address ? {
        type: 'Point',
        coordinates: [0, 0], // Placeholder - can be enhanced with geocoding
        address: session.data.address
      } : undefined,
      media: session.data.media || [],
      status: GrievanceStatus.PENDING,
      source: 'WHATSAPP'
    };

    const grievance = await Grievance.create(grievanceData);
    
    const department = departmentId ? await Department.findById(departmentId) : null;
    const deptName = department ? department.name : 'Pending Assignment';

    const successMessage = getTranslation('grievanceSuccess', session.language)
      .replace('{id}', grievance.grievanceId)
      .replace('{category}', session.data.category)
      .replace('{department}', deptName);

    await sendWhatsAppMessage(company, message.from, successMessage);

    await clearSession(message.from, company._id.toString());
    
    setTimeout(async () => {
      const newSession = getSession(message.from, company._id.toString());
      newSession.language = session.language;
      await showMainMenu(newSession, message, company);
    }, 2000);

  } catch (error: any) {
    console.error('❌ Error creating grievance:', error);
    await sendWhatsAppMessage(company, message.from, getTranslation('grievanceError', session.language));
    await clearSession(message.from, company._id.toString());
  }
}

// Start appointment flow
async function startAppointmentFlow(session: UserSession, message: ChatbotMessage, company: any) {
  const departments = await Department.find({ companyId: company._id, isActive: true, isDeleted: false });
  
  if (departments.length === 0) {
    await sendWhatsAppMessage(
      company,
      message.from,
      '⚠️ *No Departments Available*\n\nNo departments are currently available for appointments.'
    );
    await showMainMenu(session, message, company);
    return;
  }

  if (departments.length <= 3) {
    const buttons = departments.map(dept => ({
      id: `dept_${dept._id}`,
      title: dept.name
    }));
    
    await sendWhatsAppButtons(
      company,
      message.from,
      getTranslation('appointmentBook', session.language),
      buttons
    );
  } else {
    const sections = [{
      title: 'Select Department',
      rows: departments.map(dept => ({
        id: `dept_${dept._id}`,
        title: dept.name,
        description: dept.description?.substring(0, 50) || ''
      }))
    }];
    
    await sendWhatsAppList(
      company,
      message.from,
      getTranslation('appointmentBook', session.language),
      'Select Department',
      sections
    );
  }
  
  session.step = 'appointment_department';
  session.data = {};
  await updateSession(session);
}

// Continue appointment flow
async function continueAppointmentFlow(
  session: UserSession,
  userInput: string,
  message: ChatbotMessage,
  company: any
) {
  // Implementation for appointment flow
  // Similar structure to grievance flow
  await sendWhatsAppMessage(company, message.from, '📅 Appointment booking flow is being enhanced...');
  await showMainMenu(session, message, company);
}

// Handle status tracking
async function handleStatusTracking(
  session: UserSession,
  userInput: string,
  message: ChatbotMessage,
  company: any
) {
  const refNumber = userInput.trim().toUpperCase();
  
  // Search in grievances
  const grievance = await Grievance.findOne({
    companyId: company._id,
    $or: [
      { grievanceId: refNumber },
      { citizenPhone: message.from }
    ],
    isDeleted: false
  });

  if (grievance) {
    const statusEmoji = {
      'PENDING': '⏳',
      'ASSIGNED': '📋',
      'IN_PROGRESS': '🔄',
      'RESOLVED': '✅',
      'CLOSED': '✔️'
    };
    
    await sendWhatsAppMessage(
      company,
      message.from,
      `📋 *Grievance Status*\n\n` +
      `*Reference:* ${grievance.grievanceId}\n` +
      `*Status:* ${statusEmoji[grievance.status as keyof typeof statusEmoji] || '📌'} ${grievance.status}\n` +
      `*Category:* ${grievance.category || 'N/A'}\n` +
      `*Priority:* ${grievance.priority || 'MEDIUM'}\n` +
      `*Registered:* ${new Date(grievance.createdAt).toLocaleDateString()}\n\n` +
      `You will receive updates as the status changes.`
    );
  } else {
    await sendWhatsAppMessage(
      company,
      message.from,
      `❌ *Reference Not Found*\n\nWe could not find a grievance or appointment with reference number "${refNumber}".\n\nPlease check the number and try again.`
    );
  }
  
  await showMainMenu(session, message, company);
}
