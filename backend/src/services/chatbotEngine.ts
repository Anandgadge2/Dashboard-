import Company from '../models/Company';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import Department from '../models/Department';
import { GrievanceStatus, AppointmentStatus } from '../config/constants';
import { sendWhatsAppMessage, sendWhatsAppButtons, sendWhatsAppList } from './whatsappService';
import { sendOTP, verifyOTP, isPhoneVerified } from './otpService';
import { findDepartmentByCategory, getAvailableCategories } from './departmentMapper';

export interface ChatbotMessage {
  companyId: string;
  from: string;
  messageText: string;
  messageType: string;
  messageId: string;
  mediaUrl?: string;
  metadata?: any;
  buttonId?: string; // For button clicks
}

// User session with language support
interface UserSession {
  companyId: string;
  currentFlow: string | null;
  currentStepId: string | null;
  collectedData: Record<string, any>;
  language: 'en' | 'hi' | 'mr';
  phoneVerified: boolean;
  lastActivity: Date;
}

// Store user sessions (in production, use Redis)
const userSessions: Map<string, UserSession> = new Map();

// Language translations
const translations: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome! Please select your preferred language:',
    language_selected: 'Language selected. How can I help you today?',
    menu: 'Main Menu',
    raise_grievance: 'Raise Grievance',
    book_appointment: 'Book Appointment',
    track_status: 'Track Status',
    otp_sent: 'An OTP has been sent to your number. Please enter the 6-digit code:',
    otp_verified: 'OTP verified successfully!',
    otp_invalid: 'Invalid OTP. Please try again:',
    enter_name: 'Please enter your full name:',
    select_category: 'Please select the complaint category:',
    enter_description: 'Please describe your complaint in detail:',
    enter_location: 'Please share your location or type the address (or type "skip" to skip):',
    upload_photo: 'Please upload a photo if available (or type "skip" to skip):',
    grievance_created: 'Your grievance has been registered successfully! Grievance ID: {id}',
    select_number: 'Please type the number of your choice:',
    invalid_option: 'Invalid option. Please try again.'
  },
  hi: {
    welcome: 'स्वागत है! कृपया अपनी पसंदीदा भाषा चुनें:',
    language_selected: 'भाषा चुनी गई। मैं आपकी कैसे मदद कर सकता हूं?',
    menu: 'मुख्य मेनू',
    raise_grievance: 'शिकायत दर्ज करें',
    book_appointment: 'अपॉइंटमेंट बुक करें',
    track_status: 'स्थिति जांचें',
    otp_sent: 'आपके नंबर पर OTP भेजा गया है। कृपया 6 अंकों का कोड दर्ज करें:',
    otp_verified: 'OTP सफलतापूर्वक सत्यापित!',
    otp_invalid: 'अमान्य OTP। कृपया पुनः प्रयास करें:',
    enter_name: 'कृपया अपना पूरा नाम दर्ज करें:',
    select_category: 'कृपया शिकायत श्रेणी चुनें:',
    enter_description: 'कृपया अपनी शिकायत का विस्तार से वर्णन करें:',
    enter_location: 'कृपया अपना स्थान साझा करें या पता टाइप करें (या छोड़ने के लिए "skip" टाइप करें):',
    upload_photo: 'यदि उपलब्ध हो तो कृपया एक फोटो अपलोड करें (या छोड़ने के लिए "skip" टाइप करें):',
    grievance_created: 'आपकी शिकायत सफलतापूर्वक दर्ज की गई है! शिकायत ID: {id}',
    select_number: 'कृपया अपनी पसंद की संख्या टाइप करें:',
    invalid_option: 'अमान्य विकल्प। कृपया पुनः प्रयास करें।'
  },
  mr: {
    welcome: 'स्वागत आहे! कृपया तुमची आवडती भाषा निवडा:',
    language_selected: 'भाषा निवडली. मी तुमची कशी मदत करू शकतो?',
    menu: 'मुख्य मेनू',
    raise_grievance: 'तक्रार नोंदवा',
    book_appointment: 'अपॉइंटमेंट बुक करा',
    track_status: 'स्थिती तपासा',
    otp_sent: 'तुमच्या नंबरवर OTP पाठवला आहे. कृपया 6 अंकी कोड प्रविष्ट करा:',
    otp_verified: 'OTP यशस्वीरित्या सत्यापित!',
    otp_invalid: 'अवैध OTP. कृपया पुन्हा प्रयत्न करा:',
    enter_name: 'कृपया तुमचे पूर्ण नाव प्रविष्ट करा:',
    select_category: 'कृपया तक्रार श्रेणी निवडा:',
    enter_description: 'कृपया तुमची तक्रार तपशीलवार वर्णन करा:',
    enter_location: 'कृपया तुमचे स्थान सामायिक करा किंवा पत्ता टाइप करा (किंवा वगळण्यासाठी "skip" टाइप करा):',
    upload_photo: 'उपलब्ध असल्यास कृपया फोटो अपलोड करा (किंवा वगळण्यासाठी "skip" टाइप करा):',
    grievance_created: 'तुमची तक्रार यशस्वीरित्या नोंदवली गेली आहे! तक्रार ID: {id}',
    select_number: 'कृपया तुमच्या निवडीची संख्या टाइप करा:',
    invalid_option: 'अवैध पर्याय. कृपया पुन्हा प्रयत्न करा.'
  }
};

// Category names in different languages
const categoryNames: Record<string, Record<string, string>> = {
  en: {
    health: 'Health',
    education: 'Education',
    water: 'Water Supply',
    electricity: 'Electricity',
    road: 'Road & Infrastructure',
    sanitation: 'Sanitation',
    housing: 'Housing',
    employment: 'Employment',
    finance: 'Finance',
    others: 'Others'
  },
  hi: {
    health: 'स्वास्थ्य',
    education: 'शिक्षा',
    water: 'पानी की आपूर्ति',
    electricity: 'बिजली',
    road: 'सड़क और बुनियादी ढांचा',
    sanitation: 'सफाई',
    housing: 'आवास',
    employment: 'रोजगार',
    finance: 'वित्त',
    others: 'अन्य'
  },
  mr: {
    health: 'आरोग्य',
    education: 'शिक्षण',
    water: 'पाणी पुरवठा',
    electricity: 'वीज',
    road: 'रस्ते आणि पायाभूत सुविधा',
    sanitation: 'स्वच्छता',
    housing: 'गृहनिर्माण',
    employment: 'रोजगार',
    finance: 'वित्त',
    others: 'इतर'
  }
};

function getTranslation(session: UserSession, key: string): string {
  return translations[session.language]?.[key] || translations.en[key] || key;
}

export async function processWhatsAppMessage(message: ChatbotMessage): Promise<any> {
  const { companyId, from, messageText, messageType, buttonId } = message;

  try {
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return { success: false, message: 'Company not found or inactive' };
    }

    // Get or create session
    const sessionKey = `${companyId}:${from}`;
    let session = userSessions.get(sessionKey);

    // Clean up old sessions (30 minutes)
    if (session && Date.now() - session.lastActivity.getTime() > 30 * 60 * 1000) {
      userSessions.delete(sessionKey);
      session = undefined;
    }

    if (!session) {
      session = {
        companyId,
        currentFlow: null,
        currentStepId: null,
        collectedData: {},
        language: 'en',
        phoneVerified: false,
        lastActivity: new Date()
      };
      userSessions.set(sessionKey, session);
    }

    session.lastActivity = new Date();

    // Handle button clicks
    if (buttonId) {
      return await handleButtonClick(session, buttonId, message, company);
    }

    // Handle initial greeting (hi, hello, etc.)
    const normalizedMessage = messageText.toLowerCase().trim();
    if (['hi', 'hello', 'hey', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार'].includes(normalizedMessage)) {
      if (!session.language || session.currentFlow === null) {
        return await showLanguageSelection(session, company, from);
      } else if (!session.phoneVerified) {
        return await startOTPVerification(session, company, from);
      } else {
        return await showMainMenu(session, company, from);
      }
    }

    // Handle flow continuation
    if (session.currentFlow) {
      return await continueFlow(session, messageText, message, company);
    }

    // Handle menu options
    if (session.phoneVerified) {
      const menuOption = parseInt(messageText.trim());
      if (!isNaN(menuOption)) {
        return await handleMenuSelection(session, menuOption, message, company);
      }
    }

    // Default response
    const defaultMsg = getTranslation(session, 'welcome');
    await sendWhatsAppMessage(company, from, defaultMsg);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error processing WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

async function showLanguageSelection(session: UserSession, company: any, from: string) {
  const message = getTranslation(session, 'welcome');
  await sendWhatsAppButtons(company, from, message, [
    { id: 'lang_en', title: 'English' },
    { id: 'lang_hi', title: 'हिंदी' },
    { id: 'lang_mr', title: 'मराठी' }
  ]);
  return { success: true };
}

async function handleButtonClick(session: UserSession, buttonId: string, message: ChatbotMessage, company: any) {
  // Language selection
  if (buttonId.startsWith('lang_')) {
    const lang = buttonId.split('_')[1] as 'en' | 'hi' | 'mr';
    session.language = lang;
    const msg = getTranslation(session, 'language_selected');
    await sendWhatsAppMessage(company, message.from, msg);
    
    // Start OTP verification
    return await startOTPVerification(session, company, message.from);
  }

  // Menu buttons
  if (buttonId === 'menu_grievance') {
    session.currentFlow = 'grievance';
    session.collectedData.intendedFlow = 'grievance';
    session.currentStepId = 'verify_otp';
    return await startOTPVerification(session, company, message.from);
  }

  if (buttonId === 'menu_appointment') {
    session.currentFlow = 'appointment';
    session.collectedData.intendedFlow = 'appointment';
    session.currentStepId = 'verify_otp';
    return await startOTPVerification(session, company, message.from);
  }

  if (buttonId === 'menu_status') {
    session.currentFlow = 'track_status';
    session.currentStepId = 'ask_grievance_id';
    const msg = getTranslation(session, 'select_number') + '\n\nPlease enter your Grievance ID:';
    await sendWhatsAppMessage(company, message.from, msg);
    return { success: true };
  }

  return { success: true };
}

async function startOTPVerification(session: UserSession, company: any, from: string) {
  // Check if already verified (within 24 hours)
  const isVerified = await isPhoneVerified(from);
  if (isVerified) {
    session.phoneVerified = true;
    if (session.currentFlow === 'grievance') {
      return await startGrievanceFlow(session, company, from);
    } else if (session.currentFlow === 'appointment') {
      return await startAppointmentFlow(session, company, from);
    } else {
      return await showMainMenu(session, company, from);
    }
  }

  // Send OTP
  const sent = await sendOTP(company, from, session.language);
  if (sent) {
    session.currentFlow = 'otp_verification';
    session.currentStepId = 'verify_otp';
    const msg = getTranslation(session, 'otp_sent');
    await sendWhatsAppMessage(company, from, msg);
  }
  return { success: sent };
}

async function showMainMenu(session: UserSession, company: any, from: string) {
  const menuMsg = getTranslation(session, 'menu');
  await sendWhatsAppButtons(company, from, menuMsg, [
    { id: 'menu_grievance', title: getTranslation(session, 'raise_grievance') },
    { id: 'menu_appointment', title: getTranslation(session, 'book_appointment') },
    { id: 'menu_status', title: getTranslation(session, 'track_status') }
  ]);
  return { success: true };
}

async function handleMenuSelection(session: UserSession, option: number, message: ChatbotMessage, company: any) {
  switch (option) {
    case 1:
      session.currentFlow = 'grievance';
      session.collectedData.intendedFlow = 'grievance';
      session.currentStepId = 'verify_otp';
      return await startOTPVerification(session, company, message.from);
    case 2:
      session.currentFlow = 'appointment';
      session.collectedData.intendedFlow = 'appointment';
      session.currentStepId = 'verify_otp';
      return await startOTPVerification(session, company, message.from);
    case 3:
      session.currentFlow = 'track_status';
      session.currentStepId = 'ask_grievance_id';
      const msg = getTranslation(session, 'select_number') + '\n\nPlease enter your Grievance ID:';
      await sendWhatsAppMessage(company, message.from, msg);
      return { success: true };
    default:
      const invalidMsg = getTranslation(session, 'invalid_option');
      await sendWhatsAppMessage(company, message.from, invalidMsg);
      return await showMainMenu(session, company, message.from);
  }
}

async function continueFlow(session: UserSession, userInput: string, message: ChatbotMessage, company: any) {
  // OTP Verification
  if (session.currentFlow === 'otp_verification' && session.currentStepId === 'verify_otp') {
    const verified = await verifyOTP(message.from, userInput.trim());
    if (verified) {
      session.phoneVerified = true;
      const msg = getTranslation(session, 'otp_verified');
      await sendWhatsAppMessage(company, message.from, msg);
      
      // Continue to intended flow
      if (session.collectedData.intendedFlow === 'grievance') {
        session.currentFlow = 'grievance';
        return await startGrievanceFlow(session, company, message.from);
      } else if (session.collectedData.intendedFlow === 'appointment') {
        session.currentFlow = 'appointment';
        return await startAppointmentFlow(session, company, message.from);
      } else {
        return await showMainMenu(session, company, message.from);
      }
    } else {
      const msg = getTranslation(session, 'otp_invalid');
      await sendWhatsAppMessage(company, message.from, msg);
      return { success: true };
    }
  }

  // Grievance Flow
  if (session.currentFlow === 'grievance') {
    return await continueGrievanceFlow(session, userInput, message, company);
  }

  // Appointment Flow
  if (session.currentFlow === 'appointment') {
    return await continueAppointmentFlow(session, userInput, message, company);
  }

  // Track Status Flow
  if (session.currentFlow === 'track_status') {
    return await handleTrackStatus(session, userInput, message, company);
  }

  return { success: false };
}

async function startGrievanceFlow(session: UserSession, company: any, from: string) {
  session.currentStepId = 'collect_name';
  const msg = getTranslation(session, 'enter_name');
  await sendWhatsAppMessage(company, from, msg);
  return { success: true };
}

async function continueGrievanceFlow(session: UserSession, userInput: string, message: ChatbotMessage, company: any) {
  if (session.currentStepId === 'collect_name') {
    session.collectedData.name = userInput.trim();
    session.currentStepId = 'select_category';
    return await showCategorySelection(session, company, message.from);
  }

  if (session.currentStepId === 'select_category') {
    const categoryNum = parseInt(userInput.trim());
    if (!isNaN(categoryNum)) {
      const categories = await getAvailableCategories(new (await import('mongoose')).default.Types.ObjectId(session.companyId));
      if (categoryNum > 0 && categoryNum <= categories.length) {
        session.collectedData.category = categories[categoryNum - 1];
        session.currentStepId = 'collect_description';
        
        if (session.collectedData.category === 'others') {
          const msg = getTranslation(session, 'enter_description');
          await sendWhatsAppMessage(company, message.from, msg);
        } else {
          session.currentStepId = 'collect_description';
          const msg = getTranslation(session, 'enter_description');
          await sendWhatsAppMessage(company, message.from, msg);
        }
        return { success: true };
      }
    }
    const invalidMsg = getTranslation(session, 'invalid_option');
    await sendWhatsAppMessage(company, message.from, invalidMsg);
    return await showCategorySelection(session, company, message.from);
  }

  if (session.currentStepId === 'collect_description') {
    if (!userInput.trim() || userInput.toLowerCase() === 'skip') {
      session.collectedData.description = 'No description provided';
    } else {
      session.collectedData.description = userInput.trim();
    }
    session.currentStepId = 'collect_location';
    const msg = getTranslation(session, 'enter_location');
    await sendWhatsAppMessage(company, message.from, msg);
    return { success: true };
  }

  if (session.currentStepId === 'collect_location') {
    if (userInput.toLowerCase() === 'skip') {
      session.collectedData.location = null;
    } else {
      session.collectedData.location = userInput.trim();
    }
    session.currentStepId = 'collect_photo';
    const msg = getTranslation(session, 'upload_photo');
    await sendWhatsAppMessage(company, message.from, msg);
    return { success: true };
  }

  if (session.currentStepId === 'collect_photo') {
    if (userInput.toLowerCase() === 'skip') {
      session.collectedData.photo = null;
    } else if (message.mediaUrl) {
      session.collectedData.photo = message.mediaUrl;
    }
    // Create grievance
    return await createGrievance(session, message, company);
  }

  return { success: false };
}

async function showCategorySelection(session: UserSession, company: any, from: string) {
  const categories = await getAvailableCategories(new (await import('mongoose')).default.Types.ObjectId(session.companyId));
  const categoryList = categories.map((cat, index) => ({
    id: `cat_${cat}`,
    title: `${index + 1}. ${categoryNames[session.language]?.[cat] || cat}`
  }));

  const msg = getTranslation(session, 'select_category');
  
  if (categoryList.length <= 3) {
    await sendWhatsAppButtons(company, from, msg, categoryList.map(c => ({
      id: c.id,
      title: c.title.split('. ')[1]
    })));
  } else {
    // Use numbered list for more than 3
    const textMsg = `${msg}\n\n${categoryList.map(c => c.title).join('\n')}\n\n${getTranslation(session, 'select_number')}`;
    await sendWhatsAppMessage(company, from, textMsg);
  }
  return { success: true };
}

async function createGrievance(session: UserSession, message: ChatbotMessage, company: any) {
  try {
    const mongoose = await import('mongoose');
    const companyObjId = new mongoose.default.Types.ObjectId(session.companyId);
    
    // Find department by category
    const departmentId = await findDepartmentByCategory(companyObjId, session.collectedData.category || 'others');

    // Generate grievance ID
    const grievanceId = `GRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create grievance
    const grievanceData: any = {
      grievanceId,
      companyId: companyObjId,
      citizenName: session.collectedData.name,
      citizenPhone: message.from,
      citizenWhatsApp: message.from,
      description: session.collectedData.description || 'No description',
      category: session.collectedData.category || 'others',
      status: GrievanceStatus.PENDING,
      statusHistory: [{
        status: GrievanceStatus.PENDING,
        changedAt: new Date(),
        remarks: 'Grievance created via WhatsApp chatbot'
      }],
      isDeleted: false
    };

    if (departmentId) {
      grievanceData.departmentId = departmentId;
      console.log(`✅ Grievance assigned to department: ${departmentId}`);
    } else {
      console.log(`⚠️  No department found for category: ${session.collectedData.category}`);
    }

    if (session.collectedData.location) {
      grievanceData.location = {
        type: 'Point',
        coordinates: [0, 0], // Will be updated if GPS coordinates are provided
        address: session.collectedData.location
      };
    }

    if (session.collectedData.photo) {
      grievanceData.media = [{
        url: session.collectedData.photo,
        type: 'image',
        uploadedAt: new Date()
      }];
    }

    const grievance = await Grievance.create(grievanceData);

    // Send confirmation
    const msg = getTranslation(session, 'grievance_created').replace('{id}', grievanceId);
    await sendWhatsAppMessage(company, message.from, msg);

    // Clear session
    session.currentFlow = null;
    session.currentStepId = null;
    session.collectedData = {};

    return { success: true, grievanceId };

  } catch (error: any) {
    console.error('❌ Error creating grievance:', error);
    await sendWhatsAppMessage(company, message.from, 'Sorry, there was an error creating your grievance. Please try again later.');
    return { success: false, error: error.message };
  }
}

async function startAppointmentFlow(session: UserSession, company: any, from: string) {
  session.currentStepId = 'collect_name';
  const msg = getTranslation(session, 'enter_name');
  await sendWhatsAppMessage(company, from, msg);
  return { success: true };
}

async function continueAppointmentFlow(session: UserSession, userInput: string, message: ChatbotMessage, company: any) {
  // Similar to grievance flow but for appointments
  // Implementation here...
  return { success: true };
}

async function handleTrackStatus(session: UserSession, userInput: string, message: ChatbotMessage, company: any) {
  try {
    const grievance = await Grievance.findOne({
      grievanceId: userInput.trim(),
      citizenWhatsApp: message.from,
      isDeleted: false
    });

    if (grievance) {
      const statusMsg = `Your Grievance ${grievance.grievanceId} Status: ${grievance.status}\n\nDescription: ${grievance.description}`;
      await sendWhatsAppMessage(company, message.from, statusMsg);
    } else {
      await sendWhatsAppMessage(company, message.from, 'Grievance not found. Please check your Grievance ID.');
    }

    session.currentFlow = null;
    session.currentStepId = null;
    return { success: true };

  } catch (error: any) {
    console.error('❌ Error tracking status:', error);
    return { success: false };
  }
}
