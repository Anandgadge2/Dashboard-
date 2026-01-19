// Consolidated Enterprise-Level Government Chatbot Engine
// Features: Professional language, button-based interactions, voice note support, and unified module routing
import mongoose from 'mongoose';
import Company from '../models/Company';
import Department from '../models/Department';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import { GrievanceStatus, AppointmentStatus } from '../config/constants';
import { sendWhatsAppMessage, sendWhatsAppButtons, sendWhatsAppList } from './whatsappService';
import { findDepartmentByCategory, getAvailableCategories } from './departmentMapper';
import { uploadWhatsAppMediaToCloudinary } from './mediaService';

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
    welcome: '🇮🇳 *Zilla Parishad Amravati - Official Digital Portal*\n\nNamaskar! Welcome to the official WhatsApp service of Zilla Parishad Amravati.\n\nWe are dedicated to providing transparent and efficient services to all citizens.\n\n👇 *Please select your preferred language:*',
    serviceUnavailable: '⚠️ *Service Notice*\n\nThe requested service is currently under maintenance. We apologize for the inconvenience.\n\nPlease try again later or visit our official website.',
    mainMenu: '🏛️ *Citizen Services Menu*\n\nWelcome to the Zilla Parishad Digital Helpdesk.\n\n👇 *Please select a service from the options below:*',
    grievanceRaise: '📝 *Register a Grievance*\n\nYou can file a formal complaint regarding any ZP department.\n\nTo begin, please provide the details as requested.',
    appointmentBook: '📅 *Book an Offical Appointment*\n\nSchedule a meeting with government officials.\n\n👇 *Select the Department:*',
    trackStatus: '🔍 *Track Application Status*\n\nCheck the status of your Grievance or Appointment.\n\nPlease enter your *Reference Number* (e.g., GRV... or APT...):',
    grievanceName: '👤 *Citizen Identification*\n\nPlease enter your *Full Name* as it appears on official documents:',
    grievanceCategory: '📂 *Select Category*\n\nChoose the department or category tailored to your issue:',
    grievanceDescription: '✍️ *Grievance Details*\n\nPlease type a detailed description of your issue.\n\n_Tip: Include dates, location, and specific details for faster resolution._',
    grievanceLocation: '📍 *Location Details*\n\nPlease provide the location associated with this issue.\n\n👇 *Select an option:*',
    grievancePhoto: '📷 *Supporting Evidence*\n\nUpload a photo or document to support your claim (Optional).\n\n👇 *Select an option:*',
    grievancePriority: '⚡ *Urgency Level*\n\nSelect the priority level for this issue:',
    grievanceConfirm: '📋 *Confirm Submission*\n\nPlease verify your details:\n\n👤 *Name:* {name}\n🏢 *Dept:* {category}\n📝 *Issue:* {description}\n\n👇 *Is this correct?*',
    grievanceSuccess: '✅ *Grievance Registered Successfully*\n\nYour complaint has been logged in our system.\n\n🎫 *Ref No:* `{id}`\n🏢 *Dept:* {department}\n📅 *Date:* {date}\n\nYou will receive updates via SMS/WhatsApp.',
    grievanceResolvedNotify: '✅ *Resolution Update*\n\nYour grievance (Ref: `{id}`) has been addressed.\n\n📝 *Officer Remarks:* {remarks}\n\nThank you for helping us improve our services.',
    label_no_remarks: 'Case closed as per protocol.',
    grievanceError: '❌ *System Error*\n\nWe could not process your request at this moment. Please try again later.',
    backToMenu: '↩️ Main Menu',
    help: 'ℹ️ *Helpdesk & Support*\n\nFor further assistance:\n📞 *Helpline:* 1800-123-4567\n🌐 *Website:* zpamravati.gov.in\n📍 *Office:* Zilla Parishad Bhavan, Amravati\n\n_Office Hours: 10:00 AM - 6:00 PM (Mon-Sat)_',
    invalidOption: '⚠️ *Invalid Input*\n\nPlease select a valid option from the buttons provided.',
    sessionExpired: '⏳ *Session Timed Out*\n\nYour session has expired. Please type "Hi" to start again.',
    menu_grievance: '📝 File Grievance',
    menu_appointment: '📅 Book Appointment',
    menu_track: '🔍 Track Status',
    menu_help: 'ℹ️ Help & Contact',
    nav_track_another: '🔍 Track Another',
    nav_main_menu: '↩️ Main Menu',
    trackStatusPortal: '🔍 *Status Inquiry*\n\nEnter your Reference Number below to check the current status.',
    label_date: '📅 Date',
    label_ref_no: '🎫 Ref No',
    label_department: '🏢 Dept',
    label_category: '📂 Category',
    label_status: '📊 Status',
    label_priority: '⚡ Priority',
    label_description: '📝 Details',
    label_purpose: '🎯 Purpose',
    label_citizen: '👤 Name',
    label_time: '⏰ Time',
    selection_department: '🏢 *Department Selection*\n\nSelect the relevant department:',
    btn_select_dept: 'View Departments',
    err_name_invalid: '⚠️ *Invalid Name*\n\nPlease enter a valid full name (min 2 chars).',
    err_description_short: '⚠️ *Insufficient Details*\n\nPlease provide more details (min 10 chars) to help us understand the issue.',
    err_purpose_short: '⚠️ *Purpose Required*\n\nPlease specify the purpose of the visit (min 5 chars).',
    msg_type_address: '📍 Please type the address:',
    msg_upload_photo: '📷 Please upload the image/document now:',
    btn_skip_location: '⏭️ Skip',
    btn_manual_location: '✍️ Type Address',
    btn_skip_photo: '⏭️ Skip',
    btn_upload_photo: '📤 Upload',
    btn_confirm_submit: '✅ Submit Grievance',
    btn_cancel: '❌ Cancel',
    btn_confirm_book: '✅ Confirm Booking',
    label_placeholder_dept: 'General Administration',
    label_priority_low: '🟢 Low',
    label_priority_medium: '🟡 Medium',
    label_priority_high: '🔴 High',
    label_apt_header: '📅 *New Appointment*\n\nDepartment: *{dept}*\n\nPlease enter your Full Name:',
    label_select_date: '🗓️ *Select Date*\n\nChoose a convenient date:',
    label_select_time: '⏰ *Select Time Slot*\n\nChoose a time for your visit:',
     // Department names (for dynamic translation)
    'dept_Health Department': 'Health Department',
    'dept_Education Department': 'Education Department',
    'dept_Water Supply Department': 'Water Supply Department',
    'dept_Public Works Department': 'Public Works Department',
    'dept_Urban Development Department': 'Urban Development Department',
    'dept_Revenue Department': 'Revenue Department',
    'dept_Agriculture Department': 'Agriculture Department',
    'dept_Social Welfare Department': 'Social Welfare Department',
    'desc_Health Department': 'Hospitals, primary health centers, and medical services',
    'desc_Education Department': 'Schools, scholarships, and educational schemes',
    'desc_Water Supply Department': 'Drinking water supply and sanitation projects',
    'desc_Public Works Department': 'Roads, bridges, and government buildings',
    'desc_Urban Development Department': 'Town planning and municipal services',
    'desc_Revenue Department': 'Land records, taxes, and certificates',
    'desc_Agriculture Department': 'Farming schemes, seeds, and subsidies',
    'desc_Social Welfare Department': 'Pension schemes and disability support',
    appointmentConfirm: '📋 *Verify Appointment*\n\nPlease confirm your booking details:',
    err_no_record_found: '❌ *No Records Found*\n\nWe could not find any record matching that reference number.',
    grievanceCancel: '🚫 *Cancelled*\n\nThe grievance registration has been cancelled.',
    aptCancel: '🚫 *Cancelled*\n\nThe appointment booking has been cancelled.',
    aptSuccess: '✅ *Appointment Confirmed*\n\nYour meeting has been scheduled.\n\n🎫 *Ref No:* `{id}`\n🏢 *Dept:* {dept}\n📅 *Date:* {date}\n⏰ *Time:* {time}\n\nPlease arrive 15 mins early with valid ID.',
    aptError: '❌ *Booking Failed*\n\nPlease try again later.',
    nextActionPrompt: '🔄 *Next Step*\n\nWhat would you like to do?',
    msg_apt_enhanced: 'ℹ️ Appointment system is being upgraded.',
    msg_no_dept: '⚠️ No departments currently accepting appointments.',
    header_grv_status: '📄 Grievance Status',
    header_apt_status: '🗓️ Appointment Status',
    status_PENDING: 'Pending Review',
    status_ASSIGNED: 'Assigned to Officer',
    status_IN_PROGRESS: 'Investigation In Progress',
    status_RESOLVED: 'Resolved',
    status_CLOSED: 'Closed',
    status_CONFIRMED: 'Confirmed',
    status_CANCELLED: 'Cancelled',
    status_COMPLETED: 'Completed',
    footer_grv_guidance: 'For case escalation, please contact the department head.',
    footer_apt_guidance: 'Carry this digital receipt for entry.',
    err_no_record_guidance: 'Please double-check the number or contact support.'
  },
  hi: {
    welcome: '🇮🇳 *जिला परिषद अमरावती - आधिकारिक डिजिटल पोर्टल*\n\nनमस्कार! जिला परिषद अमरावती की आधिकारिक व्हाट्सएप सेवा में आपका स्वागत है।\n\nहम सभी नागरिकों को पारदर्शी और कुशल सेवाएं प्रदान करने के लिए प्रतिबद्ध हैं।\n\n👇 *कृपया अपनी पसंदीदा भाषा चुनें:*',
    serviceUnavailable: '⚠️ *सेवा सूचना*\n\nअनुरोधित सेवा वर्तमान में रखरखाव के अधीन है। असुविधा के लिए हमें खेद है।\n\nकृपया बाद में प्रयास करें या हमारी आधिकारिक वेबसाइट पर जाएं।',
    mainMenu: '🏛️ *नागरिक सेवा मेनू*\n\nजिला परिषद डिजिटल हेल्पडेस्क में आपका स्वागत है।\n\n👇 *कृपया नीचे दिए गए विकल्पों में से एक सेवा चुनें:*',
    grievanceRaise: '📝 *शिकायत दर्ज करें*\n\nआप किसी भी विभाग के संबंध में औपचारिक शिकायत दर्ज कर सकते हैं।\n\nशुरू करने के लिए, कृपया मांगी गई जानकारी प्रदान करें।',
    appointmentBook: '📅 *अधिकारी नियुक्ति (Appointment)*\n\nसरकारी अधिकारियों के साथ बैठक निर्धारित करें।\n\n👇 *विभाग चुनें:*',
    trackStatus: '🔍 *आवेदन की स्थिति देखें*\n\nअपनी शिकायत या नियुक्ति की स्थिति की जाँच करें।\n\nकृपया अपना *संदर्भ संख्या* दर्ज करें (उदा., GRV... या APT...):',
    grievanceName: '👤 *नागरिक पहचान*\n\nकृपया अपना *पूरा नाम* दर्ज करें जैसा कि आधिकारिक दस्तावेजों में है:',
    grievanceCategory: '📂 *श्रेणी चुनें*\n\nअपनी समस्या के लिए उपयुक्त विभाग या श्रेणी चुनें:',
    grievanceDescription: '✍️ *शिकायत विवरण*\n\nकृपया अपनी समस्या का विस्तृत विवरण लिखें।\n\n_सुझाव: त्वरित समाधान के लिए दिनांक, स्थान और विशिष्ट विवरण शामिल करें।_',
    grievanceLocation: '📍 *स्थान विवरण*\n\nकृपया इस समस्या से संबंधित स्थान प्रदान करें।\n\n👇 *एक विकल्प चुनें:*',
    grievancePhoto: '📷 *सहायक साक्ष्य*\n\nअपने दावे के समर्थन में फोटो या दस्तावेज़ अपलोड करें (वैकल्पिक)।\n\n👇 *एक विकल्प चुनें:*',
    grievancePriority: '⚡ *तात्कालिकता स्तर*\n\nइस समस्या के लिए प्राथमिकता स्तर चुनें:',
    grievanceConfirm: '📋 *जमा करने की पुष्टि करें*\n\nकृपया अपने विवरण की जाँच करें:\n\n👤 *नाम:* {name}\n🏢 *विभाग:* {category}\n📝 *मुद्दा:* {description}\n\n👇 *क्या यह सही है?*',
    grievanceSuccess: '✅ *शिकायत सफलतापूर्वक दर्ज की गई*\n\nआपकी शिकायत हमारे सिस्टम में दर्ज कर ली गई है।\n\n🎫 *संदर्भ सं:* `{id}`\n🏢 *विभाग:* {department}\n📅 *दिनांक:* {date}\n\nआपको एसएमएस/व्हाट्सएप के माध्यम से अपडेट प्राप्त होंगे।',
    grievanceResolvedNotify: '✅ *समाधान अपडेट*\n\nआपकी शिकायत (संदर्भ: `{id}`) का समाधान कर दिया गया है।\n\n📝 *अधिकारी की टिप्पणी:* {remarks}\n\nहमारी सेवाओं को बेहतर बनाने में मदद करने के लिए धन्यवाद।',
    label_no_remarks: 'प्रोटोकॉल के अनुसार मामला बंद।',
    grievanceError: '❌ *सिस्टम त्रुटि*\n\nहम इस समय आपके अनुरोध को संसाधित नहीं कर सके। कृपया बाद में पुनः प्रयास करें।',
    voiceReceived: '🎤 *वॉयस मैसेज प्राप्त हुआ*\n\nहमें आपका वॉयस मैसेज मिला है। बेहतर सहायता के लिए, कृपया अपना संदेश टाइप करें।',
    backToMenu: '↩️ मुख्य मेनू',
    menu_grievance: '📝 शिकायत दर्ज करें',
    menu_appointment: '📅 अपॉइंटमेंट बुक करें',
    menu_track: '🔍 स्थिति ट्रैक करें',
    menu_help: 'ℹ️ सहायता और संपर्क',
    nav_track_another: '🔍 दूसरी स्थिति देखें',
    nav_main_menu: '↩️ मुख्य मेनू',
    trackStatusPortal: '🔍 *स्थिति पूछताछ*\n\nवर्तमान स्थिति की जाँच करने के लिए नीचे अपना संदर्भ संख्या दर्ज करें।',
    label_date: '📅 दिनांक',
    label_ref_no: '🎫 संदर्भ सं',
    label_department: '🏢 विभाग',
    label_category: '📂 श्रेणी',
    label_status: '📊 स्थिति',
    label_priority: '⚡ प्राथमिकता',
    label_description: '📝 विवरण',
    label_purpose: '🎯 उद्देश्य',
    label_citizen: '👤 नाम',
    label_time: '⏰ समय',
    selection_department: '🏢 *विभाग चयन*\n\nसंबंधित विभाग का चयन करें:',
    btn_select_dept: 'विभाग देखें',
    err_name_invalid: '⚠️ *अमान्य नाम*\n\nकृपया एक मान्य पूरा नाम दर्ज करें (न्यूनतम 2 अक्षर)।',
    err_description_short: '⚠️ *अपर्याप्त विवरण*\n\nकृपया समस्या को समझने में हमारी सहायता के लिए अधिक विवरण (न्यूनतम 10 अक्षर) प्रदान करें।',
    err_purpose_short: '⚠️ *उद्देश्य आवश्यक*\n\nकृपया यात्रा का उद्देश्य निर्दिष्ट करें (न्यूनतम 5 अक्षर)।',
    msg_type_address: '📍 कृपया पता टाइप करें:',
    msg_upload_photo: '📷 कृपया अभी छवि/दस्तावेज़ अपलोड करें:',
    btn_skip_location: '⏭️ छोड़ें',
    btn_manual_location: '✍️ पता टाइप करें',
    btn_skip_photo: '⏭️ छोड़ें',
    btn_upload_photo: '📤 अपलोड करें',
    btn_confirm_submit: '✅ शिकायत जमा करें',
    btn_cancel: '❌ रद्द करें',
    btn_confirm_book: '✅ बुकिंग की पुष्टि करें',
    label_placeholder_dept: 'सामान्य प्रशासन',
    label_priority_low: '🟢 निम्न',
    label_priority_medium: '🟡 मध्यम',
    label_priority_high: '🔴 उच्च',
    label_apt_header: '📅 *नई नियुक्ति*\n\nविभाग: *{dept}*\n\nकृपया अपना पूरा नाम दर्ज करें:',
    label_select_date: '🗓️ *दिनांक चुनें*\n\nएक सुविधाजनक तारीख चुनें:',
    label_select_time: '⏰ *समय स्लॉट चुनें*\n\nअपनी यात्रा के लिए एक समय चुनें:',

    // Department names in Hindi
    'dept_Health Department': 'स्वास्थ्य विभाग',
    'dept_Education Department': 'शिक्षा विभाग',
    'dept_Water Supply Department': 'जलापूर्ति विभाग',
    'dept_Public Works Department': 'लोक निर्माण विभाग',
    'dept_Urban Development Department': 'नगर विकास विभाग',
    'dept_Revenue Department': 'राजस्व विभाग',
    'dept_Agriculture Department': 'कृषि विभाग',
    'dept_Social Welfare Department': 'समाज कल्याण विभाग',
    'desc_Health Department': 'अस्पताल, प्राथमिक स्वास्थ्य केंद्र और चिकित्सा सेवाएं',
    'desc_Education Department': 'स्कूल, छात्रवृत्ति और शैक्षिक योजनाएं',
    'desc_Water Supply Department': 'पेयजल आपूर्ति और स्वच्छता परियोजनाएं',
    'desc_Public Works Department': 'सड़कें, पुल और सरकारी इमारतें',
    'desc_Urban Development Department': 'नगर नियोजन और नगरपालिका सेवाएं',
    'desc_Revenue Department': 'भूमि रिकॉर्ड, कर और प्रमाण पत्र',
    'desc_Agriculture Department': 'खेती योजनाएं, बीज और सब्सिडी',
    'desc_Social Welfare Department': 'पेंशन योजनाएं और विकलांगता सहायता',
    appointmentConfirm: '📋 *नियुक्ति की पुष्टि करें*\n\nकृपया अपने बुकिंग विवरण की पुष्टि करें:',
    err_no_record_found: '❌ *कोई रिकॉर्ड नहीं मिला*\n\nहमें उस संदर्भ संख्या से मेल खाने वाला कोई रिकॉर्ड नहीं मिला।',
    grievanceCancel: '🚫 *रद्द किया गया*\n\nशिकायत पंजीकरण रद्द कर दिया गया है।',
    aptCancel: '🚫 *रद्द किया गया*\n\nनियुक्ति बुकिंग रद्द कर दी गई है।',
    aptSuccess: '✅ *नियुक्ति की पुष्टि हुई*\n\nआपकी बैठक निर्धारित कर दी गई है।\n\n🎫 *संदर्भ सं:* `{id}`\n🏢 *विभाग:* {dept}\n📅 *दिनांक:* {date}\n⏰ *समय:* {time}\n\nकृपया मान्य आईडी के साथ 15 मिनट पहले पहुंचें।',
    aptError: '❌ *बुकिंग विफल*\n\nकृपया बाद में पुनः प्रयास करें।',
    nextActionPrompt: '🔄 *अगला कदम*\n\nआप क्या करना चाहेंगे?',
    msg_apt_enhanced: 'ℹ️ नियुक्ति प्रणाली को अपग्रेड किया जा रहा है।',
    msg_no_dept: '⚠️ कोई भी विभाग वर्तमान में नियुक्तियाँ स्वीकार नहीं कर रहा है।',
    header_grv_status: '📄 शिकायत स्थिति',
    header_apt_status: '🗓️ नियुक्ति स्थिति',
    status_PENDING: 'समीक्षा लंबित',
    status_ASSIGNED: 'अधिकारी को सौंपा गया',
    status_IN_PROGRESS: 'जांच जारी है',
    status_RESOLVED: 'हल किया गया',
    status_CLOSED: 'बंद',
    status_CONFIRMED: 'पुष्टि की गई',
    status_CANCELLED: 'रद्द',
    status_COMPLETED: 'पूर्ण',
    footer_grv_guidance: 'मामले को आगे बढ़ाने के लिए, कृपया विभागाध्यक्ष से संपर्क करें।',
    footer_apt_guidance: 'प्रवेश के लिए यह डिजिटल रसीद साथ रखें।',
    err_no_record_guidance: 'कृपया संख्या की दोबारा जाँच करें या सहायता से संपर्क करें।',
    help: 'ℹ️ *हेल्पडेस्क और समर्थन*\n\nअधिक सहायता के लिए:\n📞 *हेल्पलाइन:* 1800-123-4567\n🌐 *वेबसाइट:* zpamravati.gov.in\n📍 *कार्यालय:* जिला परिषद भवन, अमरावती\n\n_कार्यालय समय: सुबह 10:00 - शाम 6:00 (सोम-शनि)_',
    invalidOption: '⚠️ *अमान्य इनपुट*\n\nकृपया दिए गए बटनों में से एक वैध विकल्प चुनें।',
    sessionExpired: '⏳ *सत्र समाप्त*\n\nआपका सत्र समाप्त हो गया है। कृपया फिर से शुरू करने के लिए "Hi" टाइप करें।'
  },
  mr: {
    welcome: '🇮🇳 *जिल्हा परिषद अमरावती - अधिकृत डिजिटल पोर्टल*\n\nनमस्कार! जिल्हा परिषद अमरावतीच्या अधिकृत व्हॉट्सॲप सेवेमध्ये आपले स्वागत आहे.\n\nआम्ही सर्व नागरिकांना पारदर्शक आणि कार्यक्षम सेवा देण्यासाठी कटिबद्ध आहोत.\n\n👇 *कृपया आपली पसंतीची भाषा निवडा:*',
    serviceUnavailable: '⚠️ *सेवा सूचना*\n\nविनंती केलेली सेवा सध्या देखभालीखाली आहे. गैरसोयीबद्दल क्षमस्व.\n\nकृपया नंतर प्रयत्न करा किंवा आमच्या अधिकृत वेबसाइटला भेट द्या.',
    mainMenu: '🏛️ *नागरिक सेवा मेनू*\n\nजिल्हा परिषद डिजिटल हेल्पडेस्कमध्ये आपले स्वागत आहे.\n\n👇 *कृपया खालील पर्यायांमधून सेवा निवडा:*',
    grievanceRaise: '📝 *तक्रार नोंदवा*\n\nआपण कोणत्याही विभागाशी संबंधित अधिकृत तक्रार नोंदवू शकता.\n\nसुरू करण्यासाठी, कृपया विचारलेली माहिती द्या.',
    appointmentBook: '📅 *अधिकारी भेट (Appointment)*\n\nसरकारी अधिकाऱ्यांशी भेट निश्चित करा.\n\n👇 *विभाग निवडा:*',
    trackStatus: '🔍 *अर्जाची स्थिती तपासा*\n\nतुमच्या तक्रारीची किंवा भेटीची स्थिती तपासा.\n\nकृपया तुमचा *संदर्भ क्रमांक* प्रविष्ट करा (उदा., GRV... किंवा APT...):',
    grievanceName: '👤 *नागरिकाची ओळख*\n\nकृपया अधिकृत कागदपत्रांवर असल्याप्रमाणे तुमचे *पूर्ण नाव* प्रविष्ट करा:',
    grievanceCategory: '📂 *श्रेणी निवडा*\n\nतुमच्या समस्येसाठी योग्य विभाग किंवा श्रेणी निवडा:',
    grievanceDescription: '✍️ *तक्रार तपशील*\n\nकृपया तुमच्या समस्येचे सविस्तर वर्णन करा.\n\n_टीप: जलद निराकरणासाठी दिनांक, ठिकाण आणि विशिष्ट तपशील समाविष्ट करा._',
    grievanceLocation: '📍 *स्थान तपशील*\n\nकृपया या समस्येशी संबंधित स्थान द्या.\n\n👇 *एक पर्याय निवडा:*',
    grievancePhoto: '📷 *पुरावा दस्तऐवज*\n\nतुमच्या दाव्याच्या समर्थनार्थ फोटो किंवा दस्तऐवज अपलोड करा (वैकल्पिक).\n\n👇 *एक पर्याय निवडा:*',
    grievancePriority: '⚡ *निकडीची पातळी*\n\nया समस्येसाठी प्राधान्य स्तर निवडा:',
    grievanceConfirm: '📋 *सबमिशनची पुष्टी करा*\n\nकृपया तुमचे तपशील तपासा:\n\n👤 *नाव:* {name}\n🏢 *विभाग:* {category}\n📝 *समस्या:* {description}\n\n👇 *हे बरोबर आहे का?*',
    grievanceSuccess: '✅ *तक्रार यशस्वीरित्या नोंदवली गेली*\n\nतुमची तक्रार आमच्या सिस्टममध्ये लॉग केली गेली आहे.\n\n🎫 *संदर्भ क्र:* `{id}`\n🏢 *विभाग:* {department}\n📅 *दिनांक:* {date}\n\nतुम्हाला एसएमएस/व्हॉट्सॲपद्वारे अपडेट्स मिळतील.',
    grievanceResolvedNotify: '✅ *निराकरण अपडेट*\n\nतुमच्या तक्रारीचे (संदर्भ: `{id}`) निराकरण झाले आहे.\n\n📝 *अधिकारी शेरा:* {remarks}\n\nआमच्या सेवा सुधारण्यास मदत केल्याबद्दल धन्यवाद.',
    label_no_remarks: 'प्रोटोकॉलनुसार प्रकरण बंद.',
    grievanceError: '❌ *सिस्टम त्रुटी*\n\nआम्ही यावेळी तुमच्या विनंतीवर प्रक्रिया करू शकलो नाही. कृपया नंतर पुन्हा प्रयत्न करा.',
    voiceReceived: '🎤 *व्हॉइस मेसेज प्राप्त झाला*\n\nआम्हाला तुमचा व्हॉइस मेसेज मिळाला आहे. चांगल्या मदतीसाठी, कृपया तुमचा संदेश टाइप करा.',
    backToMenu: '↩️ मुख्य मेनू',
    menu_grievance: '📝 तक्रार नोंदवा',
    menu_appointment: '📅 अपॉइंटमेंट बुक करा',
    menu_track: '🔍 स्थिती ट्रॅक करा',
    menu_help: 'ℹ️ मदत आणि संपर्क',
    nav_track_another: '🔍 दुसरी स्थिती पहा',
    nav_main_menu: '↩️ मुख्य मेनू',
    trackStatusPortal: '🔍 *स्थिती चौकशी*\n\nसध्याची स्थिती तपासण्यासाठी खाली आपला संदर्भ क्रमांक प्रविष्ट करा.',
    label_date: '📅 दिनांक',
    label_ref_no: '🎫 संदर्भ क्र',
    label_department: '🏢 विभाग',
    label_category: '📂 श्रेणी',
    label_status: '📊 स्थिती',
    label_priority: '⚡ प्राधान्य',
    label_description: '📝 तपशील',
    label_purpose: '🎯 उद्देश',
    label_citizen: '👤 नाव',
    label_time: '⏰ वेळ',
    selection_department: '🏢 *विभाग निवड*\n\nसंबंधित विभाग निवडा:',
    btn_select_dept: 'विभाग पहा',
    err_name_invalid: '⚠️ *अवैध नाव*\n\nकृपया वैध पूर्ण नाव प्रविष्ट करा (किमान २ अक्षरे).',
    err_description_short: '⚠️ *अपुरा तपशील*\n\nकृपया समस्या समजून घेण्यात आम्हाला मदत करण्यासाठी अधिक तपशील (किमान १० अक्षरे) द्या.',
    err_purpose_short: '⚠️ *उद्देश आवश्यक*\n\nकृपया भेटीचा उद्देश नमूद करा (किमान ५ अक्षरे).',
    msg_type_address: '📍 कृपया पत्ता टाइप करा:',
    msg_upload_photo: '📷 कृपया आता प्रतिमा/दस्तऐवज अपलोड करा:',
    btn_skip_location: '⏭️ वगळा',
    btn_manual_location: '✍️ पत्ता टाइप करा',
    btn_skip_photo: '⏭️ वगळा',
    btn_upload_photo: '📤 अपलोड करा',
    btn_confirm_submit: '✅ तक्रार जमा करा',
    btn_cancel: '❌ रद्द करा',
    btn_confirm_book: '✅ बुकिंगची पुष्टी करा',
    label_placeholder_dept: 'सामान्य प्रशासन',
    label_priority_low: '🟢 कमी',
    label_priority_medium: '🟡 मध्यम',
    label_priority_high: '🔴 उच्च',
    label_apt_header: '📅 *नवीन अपॉइंटमेंट*\n\nविभाग: *{dept}*\n\nकृपया तुमचे पूर्ण नाव प्रविष्ट करा:',
    label_select_date: '🗓️ *दिनांक निवडा*\n\nसोयीस्कर तारीख निवडा:',
    label_select_time: '⏰ *वेळ स्लॉट निवडा*\n\nतुमच्या भेटीसाठी वेळ निवडा:',
    // Department names in Marathi
    'dept_Health Department': 'आरोग्य विभाग',
    'dept_Education Department': 'शिक्षण विभाग',
    'dept_Water Supply Department': 'पाणी पुरवठा विभाग',
    'dept_Public Works Department': 'सार्वजनिक बांधकाम विभाग',
    'dept_Urban Development Department': 'नगर विकास विभाग',
    'dept_Revenue Department': 'महसूल विभाग',
    'dept_Agriculture Department': 'कृषी विभाग',
    'dept_Social Welfare Department': 'समाज कल्याण विभाग',
    'desc_Health Department': 'रुग्णालये, प्राथमिक आरोग्य केंद्रे आणि वैद्यकीय सेवा',
    'desc_Education Department': 'शाळा, शिष्यवृत्ती आणि शैक्षणिक योजना',
    'desc_Water Supply Department': 'पिण्याचे पाणी पुरवठा आणि स्वच्छता प्रकल्प',
    'desc_Public Works Department': 'रस्ते, पूल आणि सरकारी इमारती',
    'desc_Urban Development Department': 'नगर नियोजन आणि नगरपालिका सेवा',
    'desc_Revenue Department': 'जमीन रेकॉर्ड, कर आणि प्रमाणपत्रे',
    'desc_Agriculture Department': 'शेती योजना, बियाणे आणि सबसिडी',
    'desc_Social Welfare Department': 'पेन्शन योजना आणि अपंगत्व सहाय्य',
    appointmentConfirm: '📋 *अपॉइंटमेंटची पुष्टी करा*\n\nकृपया तुमच्या बुकिंग तपशीलाची पुष्टी करा:',
    err_no_record_found: '❌ *कोणताही रेकॉर्ड सापडला नाही*\n\nआम्हाला त्या संदर्भ क्रमांकाशी जुळणारा कोणताही रेकॉर्ड सापडला नाही.',
    grievanceCancel: '🚫 *रद्द केले*\n\nतक्रार नोंदणी रद्द केली आहे.',
    aptCancel: '🚫 *रद्द केले*\n\nअपॉइंटमेंट बुकिंग रद्द केली आहे.',
    aptSuccess: '✅ *अपॉइंटमेंट पुष्टी झाली*\n\nतुमची बैठक निश्चित केली आहे.\n\n🎫 *संदर्भ क्र:* `{id}`\n🏢 *विभाग:* {dept}\n📅 *दिनांक:* {date}\n⏰ *वेळ:* {time}\n\nकृपया वैध आयडीसह १५ मिनिटे लवकर पोहोचा.',
    aptError: '❌ *बुकिंग अयशस्वी*\n\nकृपया नंतर पुन्हा प्रयत्न करा.',
    nextActionPrompt: '🔄 *पुढील स्टेप*\n\nतुम्ही काय करू इच्छिता?',
    msg_apt_enhanced: 'ℹ️ अपॉइंटमेंट सिस्टम अपग्रेड केली जात आहे.',
    msg_no_dept: '⚠️ सध्या कोणताही विभाग अपॉइंटमेंट स्वीकारत नाही.',
    header_grv_status: '📄 तक्रार स्थिती',
    header_apt_status: '🗓️ अपॉइंटमेंट स्थिती',
    status_PENDING: 'पुनरावलोकन प्रलंबित',
    status_ASSIGNED: 'अधिकाऱ्याकडे सोपवले',
    status_IN_PROGRESS: 'तपास सुरू आहे',
    status_RESOLVED: 'निराकरण झाले',
    status_CLOSED: 'बंद',
    status_CONFIRMED: 'पुष्टी केली',
    status_CANCELLED: 'रद्द',
    status_COMPLETED: 'पूर्ण',
    footer_grv_guidance: 'प्रकरण पुढे नेण्यासाठी, कृपया विभाग प्रमुखांशी संपर्क साधा.',
    footer_apt_guidance: 'प्रवेशासाठी ही डिजिटल पावती सोबत ठेवा.',
    err_no_record_guidance: 'कृपया नंबर पुन्हा तपासा किंवा मदतीसाठी संपर्क साधा.',
    help: 'ℹ️ *हेल्पडेस्क आणि समर्थन*\n\nअधिक मदतीसाठी:\n📞 *हेल्पलाइन:* 1800-123-4567\n🌐 *वेबसाइट:* zpamravati.gov.in\n📍 *कचेरी:* जिल्हा परिषद भवन, अमरावती\n\n_कार्यालय वेळ: सकाळी १०:०० - संध्याकाळी ६:०० (सोम-शनि)_',
    invalidOption: '⚠️ *अवैध इनपुट*\n\nकृपया दिलेल्या बटणांमधून वैध पर्याय निवडा.',
    sessionExpired: '⏳ *सत्र समाप्त*\n\nतुमचे सत्र समाप्त झाले आहे. कृपया पुन्हा सुरू करण्यासाठी "Hi" टाइप करा.'
  }
};

export function getTranslation(key: string, language: 'en' | 'hi' | 'mr' = 'en'): string {
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

  console.log('🔍 Processing WhatsApp message:', { companyId, from, messageType, messageText: messageText?.substring(0, 50) });

  const company = await Company.findOne({ companyId });
  if (!company) {
    console.error('❌ Company not found:', companyId);
    return;
  }

  // FORCE: Use the phone number ID that received the message
  if (metadata?.phone_number_id) {
    console.log(`🔌 Overriding Phone Number ID from metadata: ${metadata.phone_number_id}`);
    
    // Create whatsappConfig if it doesn't exist (cast to any to allow loose typing)
    if (!company.whatsappConfig) {
      company.whatsappConfig = {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || ''
      } as any;
    }
    
    // Override phoneNumberId
    if (company.whatsappConfig) {
      company.whatsappConfig.phoneNumberId = metadata.phone_number_id as string;
    }
  }

  console.log('✅ Company found:', { name: company.name, _id: company._id, companyId: company.companyId });

  const session = getSession(from, companyId);
  let userInput = (buttonId || messageText || '').trim().toLowerCase();

  console.log('📋 Session state:', { step: session.step, language: session.language, userInput });

  // Handle voice notes/audio messages
  // Voice transcription is currently disabled - voiceTranscriptionService not available
  if (messageType === 'audio') {
    await sendWhatsAppMessage(
      company,
      from,
      '🎤 *Voice Message Received*\n\nWe received your voice message. For better assistance, please type your message or use the buttons provided.\n\nThank you for your understanding.'
    );
    return;
  }
  
 
  console.log('🔄 Processing message:', { from, step: session.step, input: userInput, type: messageType });

  // Handle global reset on greetings (like "Hi", "Hello", "Start")
  const greetings = ['hi', 'hello', 'start', 'namaste', 'नमस्ते', 'restart', 'menu'];
  if (!buttonId && greetings.includes(userInput)) {
    console.log('🔄 Global reset triggered by greeting:', userInput);
    await clearSession(from, companyId);
    const newSession = getSession(from, companyId);
    await showLanguageSelection(newSession, message, company);
    return;
  }

  // Initial greeting/auto-start if session is new
  if (session.step === 'start') {
    await showLanguageSelection(session, message, company);
    return;
  }

  // Language selection
  if (session.step === 'language_selection') {
    console.log('🌍 Language selection:', { userInput, buttonId });
    
    if (userInput === 'english' || buttonId === 'lang_en' || userInput === '1') {
      session.language = 'en';
      console.log('✅ Language set to English');
      await showMainMenu(session, message, company);
    } else if (userInput === 'hindi' || buttonId === 'lang_hi' || userInput === '2' || userInput === 'हिंदी') {
      session.language = 'hi';
      console.log('✅ Language set to Hindi');
      await showMainMenu(session, message, company);
    } else if (userInput === 'marathi' || buttonId === 'lang_mr' || userInput === '3' || userInput === 'मराठी') {
      session.language = 'mr';
      console.log('✅ Language set to Marathi');
      await showMainMenu(session, message, company);
    } else {
      console.log('⚠️ Invalid language selection');
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
  
  // Handle "Back to Main Menu" button - only if explicitly clicked
  if (buttonId === 'menu_back') {
    console.log('↩️ User clicked Back to Main Menu');
    await clearSession(message.from, company._id.toString());
    const newSession = getSession(message.from, company._id.toString());
    newSession.language = session.language || 'en';
    await showMainMenu(newSession, message, company);
    return;
  }
  
  // If in awaiting_menu state, process the menu selection
  if (session.step === 'awaiting_menu') {
    console.log('📋 Processing menu selection from awaiting_menu state');
    session.step = 'main_menu';
    await updateSession(session);
    await handleMainMenuSelection(session, message, company, buttonId || userInput);
    return;
  }

  // Default: show main menu
  await showMainMenu(session, message, company);
}

// Show language selection with professional greeting
async function showLanguageSelection(session: UserSession, message: ChatbotMessage, company: any) {
  console.log('🌐 Showing language selection to:', message.from);
  
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
  console.log('📋 Showing main menu to:', message.from, 'Language:', session.language);
  
  const buttons = [];
  
  if (company.enabledModules.includes('GRIEVANCE')) {
    buttons.push({ id: 'grievance', title: getTranslation('menu_grievance', session.language) });
  }
  
  if (company.enabledModules.includes('APPOINTMENT')) {
    buttons.push({ id: 'appointment', title: getTranslation('menu_appointment', session.language) });
  }
  
  if (buttons.length > 0) {
    buttons.push({ id: 'track', title: getTranslation('menu_track', session.language) });
  }

  buttons.push({ id: 'help', title: getTranslation('menu_help', session.language) });

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
      
      // OTP verification removed - directly start grievance flow
      await startGrievanceFlow(session, message, company);
      break;

    case 'appointment':
      if (!company.enabledModules.includes('APPOINTMENT')) {
        await sendWhatsAppMessage(company, message.from, getTranslation('serviceUnavailable', session.language));
        await showMainMenu(session, message, company);
        return;
      }
      
      // OTP verification removed - directly start appointment flow
      await startAppointmentFlow(session, message, company);
      break;

    case 'track':
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('trackStatusPortal', session.language)
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
          getTranslation('err_name_invalid', session.language)
        );
        return;
      }
      session.data.citizenName = userInput;
      
      // Get all departments directly instead of categories
      const departments = await Department.find({ 
        companyId: company._id, 
        isActive: true, 
        isDeleted: false 
      });
      
      console.log('🏬 All departments:', departments.map(d => ({ name: d.name, id: d._id })));
      
      if (departments.length > 0) {
        // WhatsApp allows max 10 rows per section, so split if needed
        const deptRows = departments.slice(0, 10).map(dept => {
          // Try to translate department name
          const translatedName = getTranslation(`dept_${dept.name}`, session.language);
          const displayName = translatedName !== `dept_${dept.name}` ? translatedName : dept.name;
          
          return {
            id: `grv_dept_${dept._id}`,
            title: displayName.length > 24 ? displayName.substring(0, 21) + '...' : displayName,
            description: getTranslation(`desc_${dept.name}`, session.language) || dept.description?.substring(0, 72) || ''
          };
        });
        
        // Create sections (WhatsApp requires at least 1 section with 1-10 rows)
        const sections = [{
          title: getTranslation('btn_select_dept', session.language),
          rows: deptRows
        }];
        
        console.log('📋 Sending department list with', deptRows.length, 'departments');
        
        try {
          await sendWhatsAppList(
            company,
            message.from,
            getTranslation('selection_department', session.language),
            getTranslation('btn_select_dept', session.language),
            sections
          );
        } catch (error) {
          console.error('❌ Failed to send list, falling back to buttons');
          // If list fails, use buttons for first 3 departments
          if (departments.length <= 3) {
            await sendWhatsAppButtons(
              company,
              message.from,
              getTranslation('selection_department', session.language),
              departments.map(dept => {
                const translatedName = getTranslation(`dept_${dept.name}`, session.language);
                const displayName = translatedName !== `dept_${dept.name}` ? translatedName : dept.name;
                return {
                  id: `grv_dept_${dept._id}`,
                  title: displayName.substring(0, 20)
                };
              })
            );
          }
        }
      } else {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('msg_no_dept', session.language)
        );
      }
      
      session.step = 'grievance_category';
      await updateSession(session);
      break;

    case 'grievance_category':
      // Extract department ID from selection
      let selectedDeptId = userInput.replace('grv_dept_', '').trim();
      if (buttonId && buttonId.startsWith('grv_dept_')) {
        selectedDeptId = buttonId.replace('grv_dept_', '');
      }
      
      console.log('🏬 Department selected for grievance:', selectedDeptId);
      
      // Get department details
      const selectedDept = await Department.findById(selectedDeptId);
      if (selectedDept) {
        session.data.departmentId = selectedDeptId;
        session.data.departmentName = selectedDept.name;
        session.data.category = selectedDept.name; // Use department name as category
        
        console.log('✅ Department found:', { name: selectedDept.name, id: selectedDeptId });
      } else {
        // Fallback if department not found
        session.data.category = userInput || 'General';
        console.log('⚠️ Department not found, using fallback');
      }
      

      
      // Priority set to medium by default
      session.data.priority = 'MEDIUM';

      // Go directly to description
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
          getTranslation('err_description_short', session.language)
        );
        return;
      }
      session.data.description = userInput;
      

      
      // Skip location and go directly to photo
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievancePhoto', session.language),
        [
          { id: 'photo_skip', title: getTranslation('btn_skip_photo', session.language) },
          { id: 'photo_upload', title: getTranslation('btn_upload_photo', session.language) }
        ]
      );
      
      session.step = 'grievance_photo';
      await updateSession(session);
      break;



    case 'grievance_photo':
      if (buttonId === 'photo_skip' || userInput === 'skip') {
        session.data.media = [];
      } else if (message.mediaUrl && (message.messageType === 'image' || message.messageType === 'document')) {
        // Professional media handling: Download from WhatsApp and upload to Cloudinary
        const accessToken = company?.whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
        const cloudinaryUrl = await uploadWhatsAppMediaToCloudinary(message.mediaUrl, accessToken as string, 'ZP amravati');
        
        session.data.media = [{ 
          url: cloudinaryUrl || message.mediaUrl, // Fallback to ID if upload fails
          type: message.messageType, 
          uploadedAt: new Date(),
          isCloudinary: !!cloudinaryUrl
        }];
      } else if (buttonId === 'photo_upload') {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('msg_upload_photo', session.language)
        );
        session.step = 'grievance_photo_upload';
        await updateSession(session);
        return;
      }
      
      // Show confirmation with buttons
      const translatedCategory = getTranslation(`dept_${session.data.category}`, session.language);
      // Priority removed from confirmation
      // const translatedPriority = getTranslation(`label_priority_${session.data.priority.toLowerCase()}`, session.language);

      const confirmMessage = getTranslation('grievanceConfirm', session.language)
        .replace('{name}', session.data.citizenName)
        .replace('{category}', translatedCategory)
        // .replace('{priority}', translatedPriority)  // Priority removed
        .replace('{description}', session.data.description.substring(0, 100) + '...');
      
      await sendWhatsAppButtons(
        company,
        message.from,
        confirmMessage,
        [
          { id: 'confirm_yes', title: getTranslation('btn_confirm_submit', session.language) },
          { id: 'confirm_no', title: getTranslation('btn_cancel', session.language) }
        ]
      );
      
      session.step = 'grievance_confirm';
      await updateSession(session);
      break;

    case 'grievance_photo_upload':
      if (message.mediaUrl && (message.messageType === 'image' || message.messageType === 'document')) {
        // Professional media handling: Download from WhatsApp and upload to Cloudinary
        const accessToken = company?.whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
        const cloudinaryUrl = await uploadWhatsAppMediaToCloudinary(message.mediaUrl, accessToken as string, 'ZP amravati');
        
        session.data.media = [{ 
          url: cloudinaryUrl || message.mediaUrl, // Fallback to ID if upload fails
          type: message.messageType, 
          uploadedAt: new Date(),
          isCloudinary: !!cloudinaryUrl
        }];
      }
      
      const translatedCat = getTranslation(`dept_${session.data.category}`, session.language);
      // Priority removed from confirmation
      // const translatedPrio = getTranslation(`label_priority_${session.data.priority.toLowerCase()}`, session.language);

      const confirmMsg = getTranslation('grievanceConfirm', session.language)
        .replace('{name}', session.data.citizenName)
        .replace('{category}', translatedCat)
        // .replace('{priority}', translatedPrio)  // Priority removed
        .replace('{description}', session.data.description.substring(0, 100) + '...');
      
      await sendWhatsAppButtons(
        company,
        message.from,
        confirmMsg,
        [
          { id: 'confirm_yes', title: getTranslation('btn_confirm_submit', session.language) },
          { id: 'confirm_no', title: getTranslation('btn_cancel', session.language) }
        ]
      );
      
      session.step = 'grievance_confirm';
      await updateSession(session);
      break;

    case 'grievance_confirm':
      console.log('✅ Grievance confirmation received:', { 
        buttonId, 
        userInput, 
        messageText: message.messageText,
        messageType: message.messageType 
      });
      
      // Check if user confirmed (more flexible matching)
      const isConfirmed = 
        buttonId === 'confirm_yes' || 
        buttonId?.includes('confirm') ||
        userInput === 'yes' || 
        userInput === 'confirm' ||
        userInput.includes('confirm') ||
        message.messageText?.toLowerCase().includes('confirm');
      
      if (isConfirmed) {
        console.log('✅ User confirmed grievance, creating...');
        await createGrievanceWithDepartment(session, message, company);
      } else {
        console.log('❌ User cancelled grievance');
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('grievanceCancel', session.language)
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
    console.log('💾 Creating grievance:', { category: session.data.category, citizenName: session.data.citizenName });
    
    // Use the department ID that was already selected by the user
    let departmentId = null;
    if (session.data.departmentId) {
      try {
        // Convert string ID to ObjectId if it's a valid string
        if (typeof session.data.departmentId === 'string') {
          departmentId = new mongoose.Types.ObjectId(session.data.departmentId);
        } else {
          departmentId = session.data.departmentId;
        }
      } catch (error) {
        console.error('❌ Error converting department ID:', error);
        // Fallback to finding by category
        departmentId = await findDepartmentByCategory(company._id, session.data.category);
      }
    }
    
    // If no department was pre-selected, try to find one by category (fallback)
    if (!departmentId) {
      console.log('⚠️ No department ID in session, searching by category...');
      departmentId = await findDepartmentByCategory(company._id, session.data.category);
    }
    
    console.log('🏬 Department for grievance:', { 
      departmentId: departmentId,
      departmentName: session.data.departmentName,
      category: session.data.category
    });
    
    
    // Generate unique grievanceId by finding the highest existing ID
    let grievanceId = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // Find the last grievance ID for this company
      const lastGrievance = await Grievance.findOne({ companyId: company._id })
        .sort({ grievanceId: -1 })
        .select('grievanceId');
      
      let nextNumber = 1;
      if (lastGrievance && lastGrievance.grievanceId) {
        const match = lastGrievance.grievanceId.match(/^GRV(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      grievanceId = `GRV${String(nextNumber).padStart(8, '0')}`;
      
      // Check if this ID already exists
      const existing = await Grievance.findOne({ grievanceId });
      if (!existing) {
        break; // ID is unique, we can use it
      }
      
      console.log(`⚠️ Grievance ID ${grievanceId} already exists, trying next...`);
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique grievance ID after multiple attempts');
    }
    
    console.log('🆔 Generated grievanceId:', grievanceId);
    
    const grievanceData = {
      grievanceId: grievanceId,  // Add the generated ID
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
      language: session.language
    };

    console.log('📝 Grievance data:', JSON.stringify(grievanceData, null, 2));

    // Use new + save instead of create to trigger pre-save hook for grievanceId generation
    const grievance = new Grievance(grievanceData);
    await grievance.save();
    
    console.log('✅ Grievance created:', { grievanceId: grievance.grievanceId, _id: grievance._id });
    
    const department = departmentId ? await Department.findById(departmentId) : null;
    let deptName = department ? department.name : getTranslation('label_placeholder_dept', session.language);
    
    // Translate department name for success message
    const translatedDeptName = department ? getTranslation(`dept_${department.name}`, session.language) : deptName;
    if (translatedDeptName !== `dept_${department?.name}`) {
      deptName = translatedDeptName;
    }

    const successMessage = getTranslation('grievanceSuccess', session.language)
      .replace('{id}', grievance.grievanceId)
      .replace('{category}', getTranslation(`dept_${session.data.category}`, session.language) !== `dept_${session.data.category}` ? getTranslation(`dept_${session.data.category}`, session.language) : session.data.category)
      .replace('{department}', deptName)
      .replace('{date}', new Date().toLocaleDateString('en-IN'));

    await sendWhatsAppMessage(company, message.from, successMessage);

    // Show Back to Main Menu button
    await sendWhatsAppButtons(
      company,
      message.from,
      '✅ *What would you like to do next?*',
      [
        { id: 'menu_back', title: '↩️ Back to Main Menu' }
      ]
    );
    
    // Update session to handlebutton
    session.step = 'awaiting_menu';
    await updateSession(session);

  } catch (error: any) {
    console.error('❌ Error creating grievance:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
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
      getTranslation('msg_no_dept', session.language)
    );
    await showMainMenu(session, message, company);
    return;
  }

  if (departments.length <= 3) {
    const buttons = departments.map(dept => {
      const translatedName = getTranslation(`dept_${dept.name}`, session.language);
      const displayName = translatedName !== `dept_${dept.name}` ? translatedName : dept.name;
      return {
        id: `dept_${dept._id}`,
        title: displayName
      };
    });
    
    await sendWhatsAppButtons(
      company,
      message.from,
      getTranslation('appointmentBook', session.language),
      buttons
    );
  } else {
    const sections = [{
      title: getTranslation('btn_select_dept', session.language),
      rows: departments.map(dept => {
        const translatedName = getTranslation(`dept_${dept.name}`, session.language);
        const displayName = translatedName !== `dept_${dept.name}` ? translatedName : dept.name;
        return {
          id: `dept_${dept._id}`,
          title: displayName.length > 24 ? displayName.substring(0, 21) + '...' : displayName,
          description: getTranslation(`desc_${dept.name}`, session.language) || dept.description?.substring(0, 72) || 'Select this department'
        };
      })
    }];
    
    console.log('📋 Sending department list:', sections);
    
    await sendWhatsAppList(
      company,
      message.from,
      getTranslation('appointmentBook', session.language),
      getTranslation('btn_select_dept', session.language),
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
  const { buttonId } = message;
  
  switch (session.step) {
    case 'appointment_department':
      // Extract department ID from button or input
      let deptId = userInput.replace('dept_', '');
      if (buttonId && buttonId.startsWith('dept_')) {
        deptId = buttonId.replace('dept_', '');
      }
      
      console.log('🏬 Department selected:', deptId);
      
      // Validate department
      const department = await Department.findById(deptId);
      if (!department) {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('invalidOption', session.language)
        );
        await showMainMenu(session, message, company);
        return;
      }
      
      const translatedDeptName = getTranslation(`dept_${department.name}`, session.language);
      const displayName = translatedDeptName !== `dept_${department.name}` ? translatedDeptName : department.name;

      session.data.departmentId = deptId;
      session.data.departmentName = department.name;
      session.data.translatedDeptName = displayName;
      
      // Ask for citizen name
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('label_apt_header', session.language).replace('{dept}', displayName)
      );
      
      session.step = 'appointment_name';
      await updateSession(session);
      break;

    case 'appointment_name':
      if (!userInput || userInput.length < 2) {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('err_name_invalid', session.language)
        );
        return;
      }
      
      session.data.citizenName = userInput;
      
      // Ask for purpose
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('label_purpose', session.language)
      );
      
      session.step = 'appointment_purpose';
      await updateSession(session);
      break;

    case 'appointment_purpose':
      if (!userInput || userInput.length < 5) {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('err_purpose_short', session.language)
        );
        return;
      }
      
      session.data.purpose = userInput;
      
      // Show date selection (next 7 days)
      const today = new Date();
      const dateButtons = [];
      
      for (let i = 1; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const locale = session.language === 'en' ? 'en-IN' : session.language === 'hi' ? 'hi-IN' : 'mr-IN';
        const dateStr = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
        dateButtons.push({
          id: `date_${date.toISOString().split('T')[0]}`,
          title: dateStr
        });
      }
      
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('label_select_date', session.language),
        dateButtons
      );
      
      session.step = 'appointment_date';
      await updateSession(session);
      break;

    case 'appointment_date':
      let selectedDate = userInput.replace('date_', '');
      if (buttonId && buttonId.startsWith('date_')) {
        selectedDate = buttonId.replace('date_', '');
      }
      
      session.data.appointmentDate = selectedDate;
      
      // Show time slots with enhanced UI
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('label_select_time', session.language),
        [
          { id: 'time_10:00', title: '🕙 10:00 AM - 11:00 AM' },
          { id: 'time_14:00', title: '🕑 2:00 PM - 3:00 PM' },
          { id: 'time_16:00', title: '🕓 4:00 PM - 5:00 PM' }
        ]
      );
      
      session.step = 'appointment_time';
      await updateSession(session);
      break;

    case 'appointment_time':
      let selectedTime = userInput.replace('time_', '');
      if (buttonId && buttonId.startsWith('time_')) {
        selectedTime = buttonId.replace('time_', '');
      }
      
      console.log('⏰ Time selected:', { buttonId, userInput, selectedTime });
      
      session.data.appointmentTime = selectedTime;
      
      // Show confirmation
      const confirmDate = new Date(session.data.appointmentDate);
      const dateDisplay = confirmDate.toLocaleDateString(session.language === 'en' ? 'en-IN' : session.language === 'hi' ? 'hi-IN' : 'mr-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Format time for display
      const timeDisplay = selectedTime.includes(':') ? selectedTime : `${selectedTime}:00`;
      
      const confirmMessage = `${getTranslation('appointmentConfirm', session.language)}\n\n` +
        `*${getTranslation('label_citizen', session.language)}:* ${session.data.citizenName}\n` +
        `*${getTranslation('label_department', session.language)}:* ${session.data.translatedDeptName || session.data.departmentName}\n` +
        `*${getTranslation('label_purpose', session.language)}:* ${session.data.purpose}\n` +
        `*${getTranslation('label_date', session.language)}:* ${dateDisplay}\n` +
        `*${getTranslation('label_time', session.language)}:* ${timeDisplay}\n\n` +
        `*${getTranslation('grievanceConfirm', session.language).split('\n').pop()}*`;
      
      await sendWhatsAppButtons(
        company,
        message.from,
        confirmMessage,
        [
          { id: 'appt_confirm_yes', title: getTranslation('btn_confirm_book', session.language) },
          { id: 'appt_confirm_no', title: getTranslation('btn_cancel', session.language) }
        ]
      );
      
      session.step = 'appointment_confirm';
      await updateSession(session);
      break;

    case 'appointment_confirm':
      console.log('✅ Appointment confirmation received:', { 
        buttonId, 
        userInput,
        messageText: message.messageText,
        messageType: message.messageType
      });
      
      // Check if user confirmed (more flexible matching)
      const isAppointmentConfirmed = 
        buttonId === 'appt_confirm_yes' || 
        buttonId?.includes('confirm') ||
        userInput === 'yes' || 
        userInput === 'confirm' ||
        userInput.includes('confirm') ||
        message.messageText?.toLowerCase().includes('confirm');
      
      if (isAppointmentConfirmed) {
        console.log('✅ User confirmed appointment, creating...');
        await createAppointment(session, message, company);
      } else {
        console.log('❌ User cancelled appointment');
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('aptCancel', session.language)
        );
        await showMainMenu(session, message, company);
      }
      break;

    default:
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('msg_apt_enhanced', session.language)
      );
      await showMainMenu(session, message, company);
  }
}

// Create appointment and save to database
async function createAppointment(
  session: UserSession,
  message: ChatbotMessage,
  company: any
) {
  try {
    console.log('💾 Creating appointment:', { 
      department: session.data.departmentName, 
      citizenName: session.data.citizenName,
      date: session.data.appointmentDate,
      time: session.data.appointmentTime
    });
    
    // Parse date and time
    const appointmentDate = new Date(session.data.appointmentDate);
    const appointmentTime = session.data.appointmentTime;
    
    
    // Generate unique appointmentId by finding the highest existing ID
    let appointmentId = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // Find the last appointment ID for this company
      const lastAppointment = await Appointment.findOne({ companyId: company._id })
        .sort({ appointmentId: -1 })
        .select('appointmentId');
      
      let nextNumber = 1;
      if (lastAppointment && lastAppointment.appointmentId) {
        const match = lastAppointment.appointmentId.match(/^APT(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      appointmentId = `APT${String(nextNumber).padStart(8, '0')}`;
      
      // Check if this ID already exists
      const existing = await Appointment.findOne({ appointmentId });
      if (!existing) {
        break; // ID is unique, we can use it
      }
      
      console.log(`⚠️ Appointment ID ${appointmentId} already exists, trying next...`);
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique appointment ID after multiple attempts');
    }
    
    console.log('🆔 Generated appointmentId:', appointmentId);
    
    const appointmentData = {
      appointmentId: appointmentId,  // Add the generated ID
      companyId: company._id,
      departmentId: session.data.departmentId,
      citizenName: session.data.citizenName,
      citizenPhone: message.from,
      citizenWhatsApp: message.from,
      purpose: session.data.purpose,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      status: AppointmentStatus.PENDING
    };

    console.log('📝 Appointment data:', JSON.stringify(appointmentData, null, 2));

    // Use new + save instead of create to trigger pre-save hook for appointmentId generation
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    console.log('✅ Appointment created:', { appointmentId: appointment.appointmentId, _id: appointment._id });
    
    const dateDisplay = appointmentDate.toLocaleDateString(session.language === 'en' ? 'en-IN' : session.language === 'hi' ? 'hi-IN' : 'mr-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const timeDisplay = appointmentTime; // Using the selected time slot directly for consistency

    const successMessage = getTranslation('aptSuccess', session.language)
      .replace('{id}', appointment.appointmentId)
      .replace('{dept}', getTranslation(`dept_${session.data.departmentName}`, session.language) !== `dept_${session.data.departmentName}` ? getTranslation(`dept_${session.data.departmentName}`, session.language) : session.data.departmentName)
      .replace('{date}', dateDisplay)
      .replace('{time}', timeDisplay);

    await sendWhatsAppMessage(company, message.from, successMessage);

    // Show Back to Main Menu button
    await sendWhatsAppButtons(
      company,
      message.from,
      '✅ *What would you like to do next?*',
      [
        { id: 'menu_back', title: '↩️ Back to Main Menu' }
      ]
    );
    
    // Update session to handle button
    session.step = 'awaiting_menu';
    await updateSession(session);

  } catch (error: any) {
    console.error('❌ Error creating appointment:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    await sendWhatsAppMessage(
      company, 
      message.from, 
      getTranslation('aptError', session.language)
    );
    await clearSession(message.from, company._id.toString());
  }
}

// Handle status tracking with professional formatting and navigation
async function handleStatusTracking(
  session: UserSession,
  userInput: string,
  message: ChatbotMessage,
  company: any
) {
  const refNumber = userInput.trim().toUpperCase();
  console.log(`🔍 Tracking request for: ${refNumber} from ${message.from}`);
  
  // 1. Search for Grievance
  const grievance = await Grievance.findOne({
    companyId: company._id,
    $or: [
      { grievanceId: refNumber },
      { citizenPhone: message.from }
    ],
    isDeleted: false
  }).sort({ createdAt: -1 }); // Get latest

  // 2. Search for Appointment
  const appointment = await Appointment.findOne({
    companyId: company._id,
    $or: [
      { appointmentId: refNumber },
      { citizenPhone: message.from }
    ],
    isDeleted: false
  }).sort({ createdAt: -1 }); // Get latest

  let foundRecord = false;

  // Professional formatting for Grievance
  if (grievance && (refNumber.startsWith('GRV') || !appointment)) {
    foundRecord = true;
    const statusEmoji: Record<string, string> = {
      'PENDING': '⏳',
      'ASSIGNED': '📋',
      'IN_PROGRESS': '🔄',
      'RESOLVED': '✅',
      'CLOSED': '✔️'
    };
    
    const dept = grievance.departmentId ? await Department.findById(grievance.departmentId) : null;
    const translatedDept = dept ? getTranslation(`dept_${dept.name}`, session.language) : null;
    const deptName = translatedDept && translatedDept !== `dept_${dept?.name}` ? translatedDept : (dept?.name || getTranslation('label_placeholder_dept', session.language));

    const translatedCategory = grievance.category ? (getTranslation(`dept_${grievance.category}`, session.language) !== `dept_${grievance.category}` ? getTranslation(`dept_${grievance.category}`, session.language) : grievance.category) : 'General';

    await sendWhatsAppMessage(
      company,
      message.from,
      `📌 *${getTranslation('header_grv_status', session.language)}*\n\n` +
      `*${getTranslation('label_date', session.language)}:* ${new Date(grievance.createdAt).toLocaleDateString('en-IN')}\n` +
      `*${getTranslation('label_ref_no', session.language)}:* \`${grievance.grievanceId}\`\n\n` +
      `*${getTranslation('label_department', session.language)}:* ${deptName}\n` +
      `*${getTranslation('label_category', session.language)}:* ${translatedCategory}\n` +
      `*${getTranslation('label_status', session.language)}:* ${statusEmoji[grievance.status] || '📌'} *${getTranslation(`status_${grievance.status}`, session.language)}*\n` +
      `*${getTranslation('label_priority', session.language)}:* ${grievance.priority || 'MEDIUM'}\n\n` +
      `*${getTranslation('label_description', session.language)}:* ${grievance.description.substring(0, 100)}${grievance.description.length > 100 ? '...' : ''}\n\n` +
      `_${getTranslation('footer_grv_guidance', session.language)}_`
    );
  } 
  
  // Professional formatting for Appointment (else if because we searched both but might want to prioritize specific ID match)
  else if (appointment) {
    foundRecord = true;
    const statusEmoji: Record<string, string> = {
      'PENDING': '⏳',
      'CONFIRMED': '✅',
      'CANCELLED': '❌',
      'COMPLETED': '✔️'
    };

    const dept = appointment.departmentId ? await Department.findById(appointment.departmentId) : null;
    const translatedDept = dept ? getTranslation(`dept_${dept.name}`, session.language) : null;
    const deptName = translatedDept && translatedDept !== `dept_${dept?.name}` ? translatedDept : (dept?.name || 'N/A');

    await sendWhatsAppMessage(
      company,
      message.from,
      `🗓️ *${getTranslation('header_apt_status', session.language)}*\n\n` +
      `*${getTranslation('label_date', session.language)}:* ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN')}\n` +
      `*${getTranslation('label_time', session.language)}:* ${appointment.appointmentTime}\n` +
      `*${getTranslation('label_ref_no', session.language)}:* \`${appointment.appointmentId}\`\n\n` +
      `*${getTranslation('label_department', session.language)}:* ${deptName}\n` +
      `*${getTranslation('label_citizen', session.language)}:* ${appointment.citizenName}\n` +
      `*${getTranslation('label_status', session.language)}:* ${statusEmoji[appointment.status] || '📌'} *${getTranslation(`status_${appointment.status}`, session.language)}*\n\n` +
      `*${getTranslation('label_purpose', session.language)}:* ${appointment.purpose}\n\n` +
      `_${getTranslation('footer_apt_guidance', session.language)}_`
    );
  }

  if (foundRecord) {
    // Show Navigation Options
    await sendWhatsAppButtons(
      company,
      message.from,
      getTranslation('mainMenu', session.language),
      [
        { id: 'track', title: getTranslation('nav_track_another', session.language) },
        { id: 'menu_back', title: getTranslation('nav_main_menu', session.language) }
      ]
    );
    session.step = 'awaiting_menu';
    await updateSession(session);
  } else {
    // Professional Error Handling
    await sendWhatsAppButtons(
      company,
      message.from,
      getTranslation('err_no_record_found', session.language) + 
      `\n\n${getTranslation('err_no_record_guidance', session.language).replace('{ref}', refNumber)}`,
      [
        { id: 'track', title: getTranslation('nav_track_another', session.language) },
        { id: 'menu_back', title: getTranslation('nav_main_menu', session.language) }
      ]
    );
    session.step = 'awaiting_menu';
    await updateSession(session);
  }
}






// Consolidated Enterprise-Level Government Chatbot Engine
// FIXED & STABLE VERSION (single-company-per-chatbot model preserved)

// import Company from '../models/Company';
// import Department from '../models/Department';
// import Grievance from '../models/Grievance';
// import Appointment from '../models/Appointment';
// import { GrievanceStatus } from '../config/constants';
// import { sendWhatsAppMessage, sendWhatsAppButtons, sendWhatsAppList } from './whatsappService';
// import { findDepartmentByCategory, getAvailableCategories } from './departmentMapper';

// /* ============================================================
//  * TYPES
//  * ============================================================ */

// export interface ChatbotMessage {
//   companyId?: string; // Optional - single-tenant mode
//   from: string;
//   messageText: string;
//   messageType: string;
//   messageId: string;
//   mediaUrl?: string;
//   metadata?: any;
//   buttonId?: string;
// }

// interface UserSession {
//   companyId: string;
//   phoneNumber: string;
//   language: 'en' | 'hi' | 'mr';
//   step: string;
//   data: Record<string, any>;
//   pendingAction?: 'grievance' | 'appointment';
//   lastActivity: Date;
// }

// /* ============================================================
//  * SESSION STORE (NOTE: MOVE TO REDIS FOR SCALE)
//  * ============================================================ */

// const userSessions: Map<string, UserSession> = new Map();
// const SESSION_TIMEOUT = 30 * 60 * 1000;

// function getSessionKey(phone: string, companyId: string) {
//   return `${phone}_${companyId}`;
// }

// function getSession(phone: string, companyId: string): UserSession {
//   const key = getSessionKey(phone, companyId);
//   let session = userSessions.get(key);

//   if (!session) {
//     session = {
//       companyId,
//       phoneNumber: phone,
//       language: 'en',
//       step: 'start',
//       data: {},
//       lastActivity: new Date()
//     };
//     userSessions.set(key, session);
//     return session;
//   }

//   if (Date.now() - session.lastActivity.getTime() > SESSION_TIMEOUT) {
//     userSessions.delete(key);
//     return getSession(phone, companyId);
//   }

//   session.lastActivity = new Date();
//   return session;
// }

// function updateSession(session: UserSession) {
//   userSessions.set(getSessionKey(session.phoneNumber, session.companyId), session);
// }

// function clearSession(phone: string, companyId: string) {
//   userSessions.delete(getSessionKey(phone, companyId));
// }

// /* ============================================================
//  * TRANSLATIONS (trimmed to essentials)
//  * ============================================================ */

// const translations: any = {
//   en: {
//     welcome: '🏛️ *Welcome to Zilla Parishad Digital Services* (Amravati)\n\nWe are here to help you. Please select your preferred language:',
//     mainMenu: '📋 *Government Services Portal*\n\nHow can we assist you today?',
//     invalidOption: '❌ Invalid selection. Please tap one of the buttons below.',
//     otpVerified: '✅ *Verification Successful*\n\nYour mobile number has been verified.',
//     otpInvalid: '❌ *Incorrect OTP*\n\nPlease check the code and try again or request a new one.',
//     help: 'ℹ️ *Help & Support*\n\nFor urgent assistance, please visit the Zilla Parishad office during working hours (10 AM - 6 PM).',
//     grievanceRaise: '📝 *Register Complaint*\n\nWe will help you file a grievance. First, we need a few details.',
//     grievanceName: '👤 Please type your *Full Name*:',
//     trackStatus: '🔍 Please enter your *Complaint Reference Number* (e.g., GRV12345):',
//     sessionExpired: '⏰ *Session Reset*\n\nFor your security, the session has timed out. Please say "Hi" to start again.',
//     serviceUnavailable: '⚠️ *System Maintenance*\n\nWe are currently upgrading our systems. Your request has been noted. Please try again in some time.',
//     errorProcessing: '⚠️ *Something went wrong*\n\nWe could not process your last request. Please try again or go back to the Main Menu.'
//   }
// };

// function t(key: string, lang: 'en' | 'hi' | 'mr' = 'en') {
//   return translations[lang]?.[key] || translations.en[key] || key;
// }

// /* ============================================================
//  * MAIN ENTRY
//  * ============================================================ */

// export async function processWhatsAppMessage(message: ChatbotMessage): Promise<void> {
//   const { from, messageText, messageType, mediaUrl, buttonId } = message;

//   // 1. ZP AMRAVATI CONTEXT (Hardcoded / Single Tenant)
//   // We do NOT strictly verify if it exists in DB to prevent bot silence.
//   // We try to fetch it for config, but fallback to defaults if missing.
//   let company: any = await Company.findOne({ companyId: 'CMP000001', isActive: true, isDeleted: false });

//   if (!company) {
//     console.warn('⚠️ ZP Amravati (CMP000001) not found in DB. Using Virtual Context.');
//     company = {
//       _id: '000000000000000000000001', // Virtual ID
//       name: 'ZP Amravati',
//       companyId: 'CMP000001',
//       enabledModules: ['GRIEVANCE', 'APPOINTMENT'],
//       whatsappConfig: {
//         phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
//         accessToken: process.env.WHATSAPP_ACCESS_TOKEN
//       }
//     };
//   }

//   const session = getSession(from, company._id.toString());
//   let input = (buttonId || messageText || '').trim().toLowerCase();



//   /* ---------------- START ---------------- */

//   if (session.step === 'start') {
//     await sendWhatsAppButtons(company, from, t('welcome'), [
//       { id: 'lang_en', title: 'English' },
//       { id: 'lang_hi', title: 'हिंदी' },
//       { id: 'lang_mr', title: 'मराठी' }
//     ]);
//     session.step = 'language';
//     updateSession(session);
//     return;
//   }

//   /* ---------------- LANGUAGE ---------------- */

//   if (session.step === 'language') {
//     if (buttonId === 'lang_en') session.language = 'en';
//     else if (buttonId === 'lang_hi') session.language = 'hi';
//     else if (buttonId === 'lang_mr') session.language = 'mr';
//     else {
//       await sendWhatsAppMessage(company, from, t('invalidOption', session.language));
//       return;
//     }

//     await showMainMenu(session, company, from);
//     return;
//   }

 
//   /* ---------------- MAIN MENU ---------------- */

//   if (session.step === 'menu') {
//     if (input === 'grievance') {

//       await startGrievance(session, company, from);
//       return;
//     }

//     if (input === 'track') {
//       await sendWhatsAppMessage(company, from, t('trackStatus', session.language));
//       session.step = 'track';
//       updateSession(session);
//       return;
//     }

//     await sendWhatsAppMessage(company, from, t('invalidOption', session.language));
//     return;
//   }

//   /* ---------------- STATUS TRACKING (FIXED) ---------------- */

//   if (session.step === 'track') {
//     const ref = input.toUpperCase();

//     const grievance = await Grievance.findOne({
//       companyId: company._id,
//       grievanceId: ref,
//       citizenPhone: from,
//       isDeleted: false
//     });

//     if (!grievance) {
//       await sendWhatsAppMessage(company, from, '❌ No grievance found for this reference.');
//       await showMainMenu(session, company, from);
//       return;
//     }

//     await sendWhatsAppMessage(
//       company,
//       from,
//       `📋 Status: ${grievance.status}\nCategory: ${grievance.category}`
//     );

//     await showMainMenu(session, company, from);
//     return;
//   }
// }

// /* ============================================================
//  * HELPERS
//  * ============================================================ */

// async function showMainMenu(session: UserSession, company: any, to: string) {
//   await sendWhatsAppButtons(company, to, t('mainMenu', session.language), [
//     { id: 'grievance', title: 'Raise Grievance' },
//     { id: 'track', title: 'Track Status' },
//     { id: 'help', title: 'Help' }
//   ]);

//   session.step = 'menu';
//   updateSession(session);
// }

// async function startGrievance(session: UserSession, company: any, to: string) {
//   await sendWhatsAppMessage(company, to, t('grievanceRaise', session.language));
//   await sendWhatsAppMessage(company, to, t('grievanceName', session.language));
//   session.step = 'grievance_name';
//   session.data = {};
//   updateSession(session);
// }

