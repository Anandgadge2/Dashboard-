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
    welcome: '🏛️ *Welcome to Zilla Parishad Digital Services*\n\nWe are committed to providing efficient and transparent government services to all citizens.\n\nPlease select your preferred language to continue:',
    serviceUnavailable: '⚠️ *Service Temporarily Unavailable*\n\nWe apologize for the inconvenience. Our services are currently under maintenance. Please try again later or contact our helpdesk.\n\nThank you for your patience.',
    mainMenu: '📋 *Government Services Portal*\n\n*Available Services:*\n\nPlease select the service you wish to access:',
    grievanceRaise: '📝 *Grievance Registration*\n\nWe take all citizen complaints seriously and ensure timely resolution.\n\nTo proceed, please provide the following information:',
    appointmentBook: '📅 *Appointment Booking*\n\nSchedule an appointment with government departments for in-person services.\n\nPlease select a department:',
    trackStatus: '🔍 *Status Tracking*\n\nTrack the status of your registered grievances or appointments.\n\nPlease enter your reference number:',
    // otpSent: '🔐 *Verification Code Sent*\n\nFor security purposes, we have sent a 6-digit verification code to your registered mobile number.\n\n*Code:* {otp}\n\n*Validity:* 10 minutes\n\nPlease enter the code to continue.',
    // otpVerified: '✅ *Verification Successful*\n\nYour identity has been verified. You may now proceed with the service.',
    // otpInvalid: '❌ *Invalid Verification Code*\n\nThe code you entered is incorrect or has expired.\n\nPlease try again or request a new code.',
    grievanceName: '👤 *Citizen Information*\n\nPlease provide your full name as per official documents:',
    grievanceCategory: '📂 *Complaint Category*\n\nPlease select the category that best describes your complaint:',
    grievanceDescription: '📝 *Complaint Details*\n\nPlease provide a detailed description of your complaint:\n\n*Guidelines:*\n• Be specific and clear\n• Include relevant dates and locations\n• Mention any previous attempts to resolve',
    grievanceLocation: '📍 *Location Information*\n\nPlease share the location or address related to your complaint:\n\n*Options:*\n• Type your address\n• Share your location\n• Type "SKIP" to continue without location',
    grievancePhoto: '📷 *Supporting Documents*\n\nYou may upload photos or documents to support your complaint:\n\n*Options:*\n• Send photo/document\n• Type "SKIP" to continue without media',
    grievancePriority: '⚡ *Priority Level*\n\nPlease select the urgency level of your complaint:',
    grievanceConfirm: '📋 *Review Your Complaint*\n\nPlease review the details before submission:\n\n*Name:* {name}\n*Category:* {category}\n*Priority:* {priority}\n*Description:* {description}\n\nIs this information correct?',
    grievanceSuccess: '✅ *Grievance Registered Successfully*\n\n*Reference Number:* {id}\n*Category:* {category}\n*Department:* {department}\n*Status:* Under Review\n\nYou will receive regular updates on the status of your complaint.\n\nThank you for using our services.',
    grievanceResolvedNotify: '✅ *Grievance Resolved*\n\nYour grievance (Ref: {id}) has been resolved.\n\n*Officer Remarks:* {remarks}\n\nThank you for your patience.',
    label_no_remarks: 'No additional remarks',
    grievanceError: '❌ *Registration Failed*\n\nWe encountered an error while processing your complaint. Please try again or contact our helpdesk.\n\nWe apologize for the inconvenience.',
    // voiceReceived: '🎤 *Voice Message Received*\n\nWe are processing your voice message. Please wait...',
    // voiceProcessing: '🔄 *Processing Voice Message*\n\nYour voice message is being transcribed. This may take a few moments.',
    // voiceError: '❌ *Voice Processing Failed*\n\nWe were unable to process your voice message. Please try typing your message or try again later.',
    backToMenu: '↩️ *Return to Main Menu*',
    help: 'ℹ️ *Help & Support*\n\nFor assistance, please:\n• Contact our helpdesk\n• Visit our office\n• Check our website\n\n*Office Hours:* 9:00 AM - 6:00 PM\n*Working Days:* Monday to Saturday',
    invalidOption: '❌ *Invalid Selection*\n\nPlease select from the available options using the buttons provided.',
    sessionExpired: '⏰ *Session Expired*\n\nYour session has expired due to inactivity. Please start again by sending "HI" or "START".',
    menu_grievance: '📝 Raise Grievance',
    menu_appointment: '📅 Book Appointment',
    menu_track: '🔍 Track Status',
    menu_help: 'ℹ️ Help & Support',
    nav_track_another: '🔍 Track Another',
    nav_main_menu: '↩️ Main Menu',
    trackStatusPortal: '🔍 *Digital Services Tracking Portal*\n\nTo check the progress of your request, please provide your reference number:\n\n✅ *Grievance:* e.g., GRV00000001\n🗓️ *Appointment:* e.g., APT00000001\n\n*Instructions:*\nSimply type or paste the code below. If searching by phone number, we will show your most recent records.',
    label_date: '📅 Date',
    label_ref_no: '🎫 Ref No',
    label_department: '🏢 Department',
    label_category: '📂 Category',
    label_status: '🏷️ Status',
    label_priority: '⚡ Priority',
    label_description: '📝 Description',
    label_purpose: '📝 Purpose',
    label_citizen: '👤 Citizen',
    label_time: '🕒 Time',
    selection_department: '📂 *Select Department*\n\nPlease select the department related to your request:',
    btn_select_dept: 'Select Department',
    err_name_invalid: '⚠️ *Invalid Name*\n\nPlease enter a valid name (minimum 2 characters).',
    err_description_short: '⚠️ *Description Too Short*\n\nPlease provide a detailed description (minimum 10 characters).',
    err_purpose_short: '⚠️ *Purpose Too Short*\n\nPlease provide a brief purpose (minimum 5 characters).',
    msg_type_address: '📍 Please type your address:',
    msg_upload_photo: '📷 Please send your photo or document now:',
    btn_skip_location: '⏭️ Skip Location',
    btn_manual_location: '✍️ Type Address',
    btn_skip_photo: '⏭️ Skip Photo',
    btn_upload_photo: '📷 Upload Photo',
    btn_confirm_submit: '✅ Confirm & Submit',
    btn_cancel: '❌ Cancel',
    btn_confirm_book: '✅ Confirm & Book',
    label_placeholder_dept: 'Pending Assignment',
    label_priority_low: '🟢 Low',
    label_priority_medium: '🟡 Medium',
    label_priority_high: '🔴 High',
    label_apt_header: '📋 *Appointment with {dept}*\n\n👤 Please provide your full name:',
    label_select_date: '📅 *Select Appointment Date*\n\nPlease choose a preferred date for your appointment:',
    label_select_time: '⏰ *Select Time Slot*\n\nPlease choose a preferred time slot:',
    // Department names (for dynamic translation)
    'dept_Health Department': 'Health Department',
    'dept_Education Department': 'Education Department',
    'dept_Water Supply Department': 'Water Supply Department',
    'dept_Public Works Department': 'Public Works Department',
    'dept_Urban Development Department': 'Urban Development Department',
    'dept_Revenue Department': 'Revenue Department',
    'dept_Agriculture Department': 'Agriculture Department',
    'dept_Social Welfare Department': 'Social Welfare Department',
    'desc_Health Department': 'Manages public health services and programs',
    'desc_Education Department': 'Manages schools and educational programs',
    'desc_Water Supply Department': 'Responsible for water supply and sanitation',
    'desc_Public Works Department': 'Manages roads and public construction',
    'desc_Urban Development Department': 'Manages urban planning and services',
    'desc_Revenue Department': 'Handles tax collection and financial management',
    'desc_Agriculture Department': 'Handles farmer welfare and crop management',
    'desc_Social Welfare Department': 'Handles social security and welfare schemes',
    appointmentConfirm: '📋 *Review Your Appointment*\n\nPlease review the details before booking:',
    err_no_record_found: '❌ *Record Not Found*\n\nWe couldn\'t find any active record matching your request.',
    grievanceCancel: '❌ *Registration Cancelled*\n\nYour grievance registration has been cancelled.',
    aptCancel: '❌ *Appointment Cancelled*\n\nYour appointment booking has been cancelled.',
    aptSuccess: '✅ *Appointment Booked Successfully*\n\n*Reference Number:* {id}\n*Department:* {dept}\n*Date:* {date}\n*Time:* {time}\n*Status:* Pending Confirmation\n\nYou will receive updates on your appointment status.\n\nThank you for using our services.',
    aptError: '❌ *Booking Failed*\n\nWe encountered an error while booking your appointment. Please try again or contact our helpdesk.',
    nextActionPrompt: '✅ *What would you like to do next?*',
    msg_apt_enhanced: '📅 Appointment booking flow is being enhanced...',
    msg_no_dept: '⚠️ *No Departments Available*\n\nNo departments are currently available for appointments.',
    header_grv_status: 'Grievance Status Details',
    header_apt_status: 'Appointment Status Details',
    status_PENDING: '⏳ Pending',
    status_ASSIGNED: '📋 Assigned',
    status_IN_PROGRESS: '🔄 In Progress',
    status_RESOLVED: '✅ Resolved',
    status_CLOSED: '✔️ Closed',
    status_CONFIRMED: '✅ Confirmed',
    status_CANCELLED: '❌ Cancelled',
    status_COMPLETED: '✔️ Completed',
    footer_grv_guidance: 'Official Response: Our team is monitoring your case. You will receive an automated update on any progress.',
    footer_apt_guidance: 'Please arrive 10 minutes prior to your scheduled time with a copy of this message.',
    err_no_record_guidance: 'We couldn\'t find any active record matching *"{ref}"* associated with your phone number.\n\n_Please verify the reference number or contact support if the issue persists._'
  },
  hi: {
    welcome: '🏛️ *जिला परिषद डिजिटल सेवाओं में आपका स्वागत है*\n\nहम सभी नागरिकों को कुशल और पारदर्शी सरकारी सेवाएं प्रदान करने के लिए प्रतिबद्ध हैं।\n\nकृपया जारी रखने के लिए अपनी पसंदीदा भाषा चुनें:',
    mainMenu: '📋 *सरकारी सेवा पोर्टल*\n\n*उपलब्ध सेवाएं:*\n\nकृपया वह सेवा चुनें जिसे आप एक्सेस करना चाहते हैं:',
    grievanceRaise: '📝 *शिकायत पंजीकरण*\n\nहम सभी नागरिक शिकायतों को गंभीरता से लेते हैं और समय पर समाधान सुनिश्चित करते हैं।\n\nआगे बढ़ने के लिए, कृपया निम्नलिखित जानकारी प्रदान करें:',
    appointmentBook: '📅 *अपॉइंटमेंट बुकिंग*\n\nव्यक्तिगत सेवाओं के लिए सरकारी विभागों के साथ अपॉइंटमेंट निर्धारित करें।\n\nकृपया एक विभाग चुनें:',
    voiceReceived: '🎤 *वॉइस मैसेज प्राप्त हुआ*\n\nहम आपके वॉइस मैसेज को प्रोसेस कर रहे हैं। कृपया प्रतीक्षा करें...',
    backToMenu: '↩️ *मुख्य मेनू पर वापस जाएं*',
    menu_grievance: '📝 शिकायत दर्ज करें',
    menu_appointment: '📅 अपॉइंटमेंट बुक करें',
    menu_track: '🔍 स्थिति ट्रैक करें',
    menu_help: 'ℹ️ सहायता और समर्थन',
    nav_track_another: '🔍 दूसरा ट्रैक करें',
    nav_main_menu: '↩️ मुख्य मेनू',
    trackStatusPortal: '🔍 *डिजिटल सेवा ट्रैकिंग पोर्टल*\n\nअपने अनुरोध की प्रगति की जांच करने के लिए, कृपया अपना संदर्भ नंबर प्रदान करें:\n\n✅ *शिकायत:* उदा., GRV00000001\n🗓️ *अपॉइंटमेंट:* उदा., APT00000001\n\n*निर्देश:*\nबस नीचे कोड टाइप करें या पेस्ट करें। यदि फोन नंबर से खोज रहे हैं, तो हम आपके सबसे हालिया रिकॉर्ड दिखाएंगे।',
    label_date: '📅 दिनांक',
    label_ref_no: '🎫 संदर्भ संख्या',
    label_department: '🏢 विभाग',
    label_category: '📂 श्रेणी',
    label_status: '🏷️ स्थिति',
    label_priority: '⚡ प्राथमिकता',
    label_description: '📝 विवरण',
    label_purpose: '📝 उद्देश्य',
    label_citizen: '👤 नागरिक',
    label_time: '🕒 समय',
    selection_department: '📂 *विभाग चुनें*\n\nकृपया अपने अनुरोध से संबंधित विभाग चुनें:',
    btn_select_dept: 'विभाग चुनें',
    err_name_invalid: '⚠️ *अमान्य नाम*\n\nकृपया एक मान्य नाम दर्ज करें (न्यूनतम 2 अक्षर)।',
    err_description_short: '⚠️ *विवरण बहुत छोटा है*\n\nकृपया विस्तृत विवरण प्रदान करें (न्यूनतम 10 अक्षर)।',
    err_purpose_short: '⚠️ *उद्देश्य बहुत छोटा है*\n\nकृपया संक्षिप्त उद्देश्य प्रदान करें (न्यूनतम 5 अक्षर)।',
    msg_type_address: '📍 कृपया अपना पता टाइप करें:',
    msg_upload_photo: '📷 कृपया अपनी फोटो या दस्तावेज अभी भेजें:',
    btn_skip_location: '⏭️ स्थान छोड़ें',
    btn_manual_location: '✍️ पता टाइप करें',
    btn_skip_photo: '⏭️ फोटो छोड़ें',
    btn_upload_photo: '📷 फोटो अपलोड करें',
    btn_confirm_submit: '✅ पुष्टि करें और सबमिट करें',
    btn_cancel: '❌ रद्द करें',
    btn_confirm_book: '✅ पुष्टि करें और बुक करें',
    label_placeholder_dept: 'असाइनमेंट लंबित है',
    label_priority_low: '🟢 कम',
    label_priority_medium: '🟡 मध्यम',
    label_priority_high: '🔴 उच्च',
    label_apt_header: '📋 *{dept} के साथ अपॉइंटमेंट*\n\n👤 कृपया अपना पूरा नाम प्रदान करें:',
    label_select_date: '📅 *अपॉइंटमेंट की तारीख चुनें*\n\nकृपया अपने अपॉइंटमेंट के लिए पसंदीदा तारीख चुनें:',
    label_select_time: '⏰ *समय स्लॉट चुनें*\n\nकृपया पसंदीदा समय स्लॉट चुनें:',
    grievanceName: '👤 *नागरिक जानकारी*\n\nकृपया आधिकारिक दस्तावेजों के अनुसार अपना पूरा नाम प्रदान करें:',
    grievancePriority: '⚡ *प्राथमिकता स्तर*\n\nकृपया अपनी शिकायत का तत्परता स्तर चुनें:',
    grievanceDescription: '📝 *शिकायत विवरण*\n\nकृपया अपनी शिकायत का विस्तृत विवरण प्रदान करें:',
    grievanceLocation: '📍 *स्थान की जानकारी*\n\nकृपया अपनी शिकायत से संबंधित स्थान या पता साझा करें:',
    grievancePhoto: '📷 *सहायक दस्तावेज*\n\nआप अपनी शिकायत के समर्थन में फोटो या दस्तावेज अपलोड कर सकते हैं:',
    grievanceConfirm: '📋 *अपनी शिकायत की समीक्षा करें*\n\nकृपया सबमिट करने से पहले विवरण की समीक्षा करें:\n\n*नाम:* {name}\n*श्रेणी:* {category}\n*प्राथमिकता:* {priority}\n*विवरण:* {description}\n\nक्या यह जानकारी सही है?',
    grievanceSuccess: '✅ *शिकायत सफलतापूर्वक पंजीकृत*\n\n*संदर्भ संख्या:* {id}\n*श्रेणी:* {category}\n*विभाग:* {department}\n*स्थिति:* समीक्षा के अधीन\n\nआपको अपनी शिकायत की स्थिति पर नियमित अपडेट प्राप्त होंगे।',
    grievanceResolvedNotify: '✅ *शिकायत का समाधान हो गया*\n\nआपकी शिकायत (संदर्भ: {id}) का समाधान कर दिया गया है।\n\n*अधिकारी की टिप्पणी:* {remarks}\n\nआपके धैर्य के लिए धन्यवाद।',
    label_no_remarks: 'कोई अतिरिक्त टिप्पणी नहीं',
    // Department names in Hindi
    'dept_Health Department': 'स्वास्थ्य विभाग',
    'dept_Education Department': 'शिक्षा विभाग',
    'dept_Water Supply Department': 'जलापूर्ति विभाग',
    'dept_Public Works Department': 'लोक निर्माण विभाग',
    'dept_Urban Development Department': 'नगर विकास विभाग',
    'dept_Revenue Department': 'राजस्व विभाग',
    'dept_Agriculture Department': 'कृषि विभाग',
    'dept_Social Welfare Department': 'समाज कल्याण विभाग',
    'desc_Health Department': 'सार्वजनिक स्वास्थ्य सेवाओं और कार्यक्रमों का प्रबंधन करता है',
    'desc_Education Department': 'स्कूलों और शैक्षिक कार्यक्रमों का प्रबंधन करता है',
    'desc_Water Supply Department': 'जलापूर्ति और स्वच्छता के लिए जिम्मेदार',
    'desc_Public Works Department': 'सड़कों और सार्वजनिक निर्माण का प्रबंधन करता है',
    'desc_Urban Development Department': 'नगर नियोजन और सेवाओं का प्रबंधन करता है',
    'desc_Revenue Department': 'राजस्व संग्रह और वित्तीय प्रबंधन संभालता है',
    'desc_Agriculture Department': 'किसान कल्याण और फसल प्रबंधन संभालता है',
    'desc_Social Welfare Department': 'सामाजिक सुरक्षा और कल्याणकारी योजनाओं को संभालता है',
    appointmentConfirm: '📋 *अपने अपॉइंटमेंट की समीक्षा करें*\n\nकृपया बुकिंग से पहले विवरण की समीक्षा करें:',
    err_no_record_found: '❌ *कोई रिकॉर्ड नहीं मिला*\n\nहमें आपके अनुरोध से मेल खाने वाला कोई सक्रिय रिकॉर्ड नहीं मिला।',
    grievanceCancel: '❌ *पंजीकरण रद्द*\n\nआपका शिकायत पंजीकरण रद्द कर दिया गया है।',
    aptCancel: '❌ *अपॉइंटमेंट रद्द*\n\nआपकी अपॉइंटमेंट बुकिंग रद्द कर दी गई है।',
    aptSuccess: '✅ *अपॉइंटमेंट सफलतापूर्वक बुक हो गई*\n\n*संदर्भ संख्या:* {id}\n*विभाग:* {dept}\n*दिनांक:* {date}\n*समय:* {time}\n*स्थिति:* पुष्टि लंबित\n\nआपको अपनी अपॉइंटमेंट की स्थिति पर अपडेट प्राप्त होंगे।\n\nहमारी सेवाओं का उपयोग करने के लिए धन्यवाद।',
    aptError: '❌ *बुकिंग विफल*\n\nआपकी अपॉइंटमेंट बुक करते समय हमें एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें या हमारे हेल्पडेस्क से संपर्क करें।',
    nextActionPrompt: '✅ *आप आगे क्या करना चाहेंगे?*',
    msg_apt_enhanced: '📅 अपॉइंटमेंट बुकिंग प्रक्रिया को बेहतर बनाया जा रहा है...',
    msg_no_dept: '⚠️ *कोई विभाग उपलब्ध नहीं*\n\nअपॉइंटमेंट के लिए वर्तमान में कोई विभाग उपलब्ध नहीं हैं।',
    header_grv_status: 'शिकायत स्थिति विवरण',
    header_apt_status: 'अपॉइंटमेंट स्थिति विवरण',
    status_PENDING: '⏳ लंबित',
    status_ASSIGNED: '📋 असाइन किया गया',
    status_IN_PROGRESS: '🔄 प्रगति पर',
    status_RESOLVED: '✅ हल किया गया',
    status_CLOSED: '✔️ बंद',
    status_CONFIRMED: '✅ पुष्ट',
    status_CANCELLED: '❌ रद्द',
    status_COMPLETED: '✔️ पूरा हुआ',
    footer_grv_guidance: 'आधिकारिक प्रतिक्रिया: हमारी टीम आपके मामले की निगरानी कर रही है। आप किसी भी प्रगति पर स्वचालित अपडेट प्राप्त करेंगे।',
    footer_apt_guidance: 'कृपया इस संदेश की एक प्रति के साथ अपने निर्धारित समय से 10 मिनट पहले पहुंचें।',
    err_no_record_guidance: 'हमें आपके फ़ोन नंबर से जुड़े *"{ref}"* से मेल खाने वाला कोई सक्रिय रिकॉर्ड नहीं मिला।\n\n_कृपया संदर्भ संख्या सत्यापित करें या समस्या बनी रहने पर सहायता से संपर्क करें।_'
  },
  mr: {
    welcome: '🏛️ *जिल्हा परिषद डिजिटल सेवांमध्ये आपले स्वागत आहे*\n\nआम्ही सर्व नागरिकांना कार्यक्षम आणि पारदर्शक सरकारी सेवा प्रदान करण्यासाठी वचनबद्ध आहोत।\n\nपुढील सेवांसाठी कृपया आपली पसंतीची भाषा निवडा:',
    serviceUnavailable: '⚠️ *सेवा तात्पुरती अनुपलब्ध*\n\nआम्ही गैरसोयीबद्दल दिलगीर आहोत. आमच्या सेवा सध्या देखभालीखाली आहेत. कृपया नंतर पुन्हा प्रयत्न करा किंवा आमच्या हेल्पडेस्कशी संपर्क साधा.\n\nतुमच्या संयमाबद्दल धन्यवाद.',
    mainMenu: '📋 *सरकारी सेवा पोर्टल*\n\n*उपलब्ध सेवा:*\n\nकृपया आपण प्रवेश करू इच्छित सेवा निवडा:',
    grievanceRaise: '📝 *तक्रार नोंदणी*\n\nआम्ही सर्व नागरिक तक्रारींना गंभीरपणे घेतो आणि वेळेवर निराकरण सुनिश्चित करतो।\n\nपुढील प्रक्रियेसाठी कृपया खालील माहिती प्रदान करा:',
    appointmentBook: '📅 *अपॉइंटमेंट बुकिंग*\n\nप्रत्यक्ष सेवांसाठी सरकारी विभागांकडे अपॉइंटमेंट निश्चित करा.\n\nकृपया एक विभाग निवडा:',
    trackStatus: '🔍 *स्थिती ट्रॅकिंग*\n\nतुमच्या नोंदणीकृत तक्रारी किंवा अपॉइंटमेंटची स्थिती ट्रॅक करा.\n\nकृपया आपला संदर्भ क्रमांक प्रविष्ट करा:',
    voiceReceived: '🎤 *व्हॉइस मेसेज प्राप्त झाले*\n\nआम्ही आपला व्हॉइस मेसेज प्रक्रिया करत आहोत. कृपया प्रतीक्षा करा...',
    backToMenu: '↩️ *मुख्य मेनूवर परत जा*',
    menu_grievance: '📝 तक्रार नोंदवा',
    menu_appointment: '📅 अपॉइंटमेंट बुक करा',
    menu_track: '🔍 स्थिती ट्रॅक करा',
    menu_help: 'ℹ️ मदत आणि समर्थन',
    nav_track_another: '🔍 दुसरे ट्रॅक करा',
    nav_main_menu: '↩️ मुख्य मेनू',
    trackStatusPortal: '🔍 *डिजिटल सेवा ट्रॅकिंग पोर्टल*\n\nतुमच्या विनंतीच्या प्रगतीची तपासणी करण्यासाठी, कृपया आपला संदर्भ क्रमांक प्रविष्ट करा:\n\n✅ *तक्रार:* उदा., GRV00000001\n🗓️ *अपॉइंटमेंट:* उदा., APT00000001\n\n*सूचना:*\nखाली फक्त कोड टाइप करा किंवा पेस्ट करा. फोन नंबरवरून शोधत असल्यास, आम्ही तुमची सर्वात अलीकडील नोंद दाखवू।',
    label_date: '📅 दिनांक',
    label_ref_no: '🎫 संदर्भ क्रमांक',
    label_department: '🏢 विभाग',
    label_category: '📂 प्रवर्ग',
    label_status: '🏷️ स्थिती',
    label_priority: '⚡ प्राथमिकता',
    label_description: '📝 वर्णन',
    label_purpose: '📝 उद्देश',
    label_citizen: '👤 नागरिक',
    label_time: '🕒 वेळ',
    selection_department: '📂 *विभाग निवडा*\n\nकृपया आपल्या विनंतीशी संबंधित विभाग निवडा:',
    btn_select_dept: 'विभाग निवडा',
    err_name_invalid: '⚠️ *अवैध नाव*\n\nकृपया वैध नाव प्रविष्ट करा (किमान २ अक्षरे).',
    err_description_short: '⚠️ *वर्णन खूप लहान आहे*\n\nकृपया तपशीलवार वर्णन प्रदान करा (किमान १० अक्षरे).',
    err_purpose_short: '⚠️ *उद्देश खूप लहान आहे*\n\nकृपया थोडक्यात उद्देश प्रदान करा (किमान ५ अक्षरे).',
    msg_type_address: '📍 कृपया आपला पत्ता टाइप करा:',
    msg_upload_photo: '📷 कृपया आपला फोटो किंवा दस्तऐवज आता पाठवा:',
    btn_skip_location: '⏭️ स्थान वगळा',
    btn_manual_location: '✍️ पत्ता टाइप करा',
    btn_skip_photo: '⏭️ फोटो वगळा',
    btn_upload_photo: '📷 फोटो अपलोड करा',
    btn_confirm_submit: '✅ पुष्टी करा आणि सबमिट करा',
    btn_cancel: '❌ रद्द करा',
    btn_confirm_book: '✅ पुष्टी करा आणि बुक करा',
    label_placeholder_dept: 'नेमणूक प्रलंबित आहे',
    label_priority_low: '🟢 कमी',
    label_priority_medium: '🟡 मध्यम',
    label_priority_high: '🔴 उच्च',
    label_apt_header: '📋 *{dept} सोबत अपॉइंटमेंट*\n\n👤 कृपया आपले पूर्ण नाव द्या:',
    label_select_date: '📅 *अपॉइंटमेंटची तारीख निवडा*\n\nकृपया आपल्या अपॉइंटमेंटसाठी पसंतीची तारीख निवडा:',
    label_select_time: '⏰ *वेळ स्लॉट निवडा*\n\nकृपया पसंतीचा वेळ स्लॉट निवडा:',
    grievanceName: '👤 *नागरिक माहिती*\n\nकृपया अधिकृत कागदपत्रांनुसार आपले पूर्ण नाव द्या:',
    grievancePriority: '⚡ *प्राधान्य स्तर*\n\nपुढीलपैकी तुमच्या तक्रारीचा निकडीचा स्तर निवडा:',
    grievanceDescription: '📝 *तक्रार तपशील*\n\nकृपया आपल्या तक्रारीचे तपशीलवार वर्णन द्या:',
    grievanceLocation: '📍 *स्थान माहिती*\n\nकृपया आपल्या तक्रारीशी संबंधित स्थान किंवा पत्ता शेअर करा:',
    grievancePhoto: '📷 *सहायक दस्तऐवज*\n\nतुम्ही तुमच्या तक्रारीच्या समर्थनासाठी फोटो किंवा दस्तऐवज अपलोड करू शकता:',
    grievanceConfirm: '📋 *आपल्या तक्रारीचे पुनरावलोकन करा*\n\nकृपया सबमिट करण्यापूर्वी तपशीलांचे पुनरावलोकन करा:\n\n*नाव:* {name}\n*प्रवर्ग:* {category}\n*प्राधान्य:* {priority}\n*वर्णन:* {description}\n\nही माहिती बरोबर आहे का?',
    grievanceSuccess: '✅ *तक्रार यशस्वीरित्या नोंदवली*\n\n*संदर्भ क्रमांक:* {id}\n*प्रवर्ग:* {category}\n*विभाग:* {department}\n*स्थिती:* पुनरावलोकन सुरू\n\nआपल्याला आपल्या तक्रारीच्या स्थितीवर नियमित अपडेट्स मिळतील।',
    grievanceResolvedNotify: '✅ *तक्रारीचे निवारण झाले*\n\nतुमच्या तक्रारीचे (संदर्भ: {id}) यशस्वीरित्या निवारण झाले आहे.\n\n*अधिकारी अभिप्राय:* {remarks}\n\nतुमच्या संयमाबद्दल धन्यवाद।',
    label_no_remarks: 'कोणताही अतिरिक्त अभिप्राय नाही',
    grievanceError: '❌ *नोंदणी अयशस्वी*\n\nतुमची तक्रार प्रक्रिया करताना आम्हाला त्रुटी आली. कृपया पुन्हा प्रयत्न करा किंवा आमच्या हेल्पडेस्कशी संपर्क साधा।',
    help: 'ℹ️ *मदत आणि समर्थन*\n\nमदतीसाठी, कृपया:\n• आमच्या हेल्पडेस्कशी संपर्क साधा\n• आमच्या कार्यालयाला भेट द्या\n• आमची वेबसाइट तपासा\n\n*कार्यालयीन वेळ:* सकाळी ९:०० - संध्याकाळी ६:००\n*कामाचे दिवस:* सोमवार ते शनिवार',
    invalidOption: '❌ *अवैध निवड*\n\nकृपया दिलेल्या बटणांचा वापर करून उपलब्ध पर्यायांपैकी निवडा।',
    sessionExpired: '⏰ *सत्र संपले*\n\nनिष्क्रियतेमुळे तुमचे सत्र संपले आहे. कृपया "HI" किंवा "START" पाठवून पुन्हा सुरुवात करा।',
    // Department names in Marathi
    'dept_Health Department': 'आरोग्य विभाग',
    'dept_Education Department': 'शिक्षण विभाग',
    'dept_Water Supply Department': 'पाणी पुरवठा विभाग',
    'dept_Public Works Department': 'सार्वजनिक बांधकाम विभाग',
    'dept_Urban Development Department': 'नगर विकास विभाग',
    'dept_Revenue Department': 'महसूल विभाग',
    'dept_Agriculture Department': 'कृषी विभाग',
    'dept_Social Welfare Department': 'समाज कल्याण विभाग',
    'desc_Health Department': 'सार्वजनिक आरोग्य सेवा आणि कार्यक्रमांचे व्यवस्थापन करते',
    'desc_Education Department': 'शाळा आणि शैक्षणिक कार्यक्रमांचे व्यवस्थापन करते',
    'desc_Water Supply Department': 'पाणी पुरवठा आणि स्वच्छतेसाठी जबाबदार',
    'desc_Public Works Department': 'रस्ते आणि सार्वजनिक बांधकामांचे व्यवस्थापन करते',
    'desc_Urban Development Department': 'नगररचना आणि सेवांचे व्यवस्थापन करते',
    'desc_Revenue Department': 'महसूल संकलन आणि आर्थिक व्यवस्थापन हाताळते',
    'desc_Agriculture Department': 'शेतकरी कल्याण आणि पीक व्यवस्थापन हाताळते',
    'desc_Social Welfare Department': 'सामाजिक सुरक्षा आणि कल्याणकारी योजना हाताळते',
    appointmentConfirm: '📋 *तुमच्या अपॉइंटमेंटचे पुनरावलोकन करा*\n\nकृपया बुकिंग करण्यापूर्वी तपशीलांचे पुनरावलोकन करा:',
    err_no_record_found: '❌ *कोणताही रेकॉर्ड सापडला नाही*\n\nआम्हाला तुमच्या विनंतीशी जुळणारा कोणताही सक्रिय रेकॉर्ड सापडला नाही।',
    grievanceCancel: '❌ *नोंदणी रद्द केली*\n\nतुमची तक्रार नोंदणी रद्द करण्यात आली आहे.',
    aptCancel: '❌ *अपॉइंटमेंट रद्द केली*\n\nतुमची अपॉइंटमेंट बुकिंग रद्द करण्यात आली आहे.',
    aptSuccess: '✅ *अपॉइंटमेंट यशस्वीरित्या बुक झाली*\n\n*संदर्भ क्रमांक:* {id}\n*विभाग:* {dept}\n*दिनांक:* {date}\n*वेळ:* {time}\n*स्थिती:* पुष्टी प्रलंबित\n\nतुम्हाला तुमच्या अपॉइंटमेंटच्या स्थितीबद्दल अपडेट्स मिळतील।\n\nआमच्या सेवा वापरल्याबद्दल धन्यवाद।',
    aptError: '❌ *बुकिंग अयशस्वी*\n\nतुमची अपॉइंटमेंट बुक करताना आम्हाला त्रुटी आली. कृपया पुन्हा प्रयत्न करा किंवा आमच्या हेल्पडेस्कशी संपर्क साधा।',
    nextActionPrompt: '✅ *तुम्हाला पुढे काय करायला आवडेल?*',
    msg_apt_enhanced: '📅 अपॉइंटमेंट बुकिंग प्रक्रिया सुधारली जात आहे...',
    msg_no_dept: '⚠️ *कोणतेही विभाग उपलब्ध नाहीत*\n\nसध्या अपॉइंटमेंटसाठी कोणतेही विभाग उपलब्ध नाहीत.',
    header_grv_status: 'तक्रार स्थिती तपशील',
    header_apt_status: 'अपॉइंटमेंट स्थिती तपशील',
    status_PENDING: '⏳ प्रलंबित',
    status_ASSIGNED: '📋 नियुक्त केलेले',
    status_IN_PROGRESS: '🔄 प्रगतीपथावर',
    status_RESOLVED: '✅ निवारण झाले',
    status_CLOSED: '✔️ बंद',
    status_CONFIRMED: '✅ पुष्टी केली',
    status_CANCELLED: '❌ रद्द केले',
    status_COMPLETED: '✔️ पूर्ण झाले',
    footer_grv_guidance: 'अधिकृत प्रतिसाद: आमची टीम तुमच्या प्रकरणावर लक्ष ठेवून आहे. तुम्हाला कोणत्याही प्रगतीबद्दल स्वयंचलित अपडेट मिळेल।',
    footer_apt_guidance: 'कृपया या संदेशाच्या प्रतीसह तुमच्या नियोजित वेळेच्या १० मिनिटे आधी पोहोचा।',
    err_no_record_guidance: 'आम्हाला तुमच्या फोन नंबरशी संबंधित *"{ref}"* शी जुळणारा कोणताही सक्रिय रेकॉर्ड सापडला नाही।\n\n_कृपया संदर्भ क्रमांकाची पडताळणी करा किंवा समस्या कायम राहिल्यास समर्थनाशी संपर्क साधा।_'
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
        // Build department list
        const deptRows = departments.map(dept => {
          // Try to translate department name
          const translatedName = getTranslation(`dept_${dept.name}`, session.language);
          const displayName = translatedName !== `dept_${dept.name}` ? translatedName : dept.name;
          
          return {
            id: `grv_dept_${dept._id}`,
            title: displayName.length > 24 ? displayName.substring(0, 21) + '...' : displayName,
            description: getTranslation(`desc_${dept.name}`, session.language) || dept.description?.substring(0, 72) || 'Select this department'
          };
        });
        
        const sections = [{
          title: getTranslation('btn_select_dept', session.language),
          rows: deptRows
        }];
        
        await sendWhatsAppList(
          company,
          message.from,
          getTranslation('selection_department', session.language),
          getTranslation('btn_select_dept', session.language),
          sections
        );
      } else {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('selection_department', session.language)
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
      
      // Priority selection commented out - set default priority
      session.data.priority = 'MEDIUM';
      
      /* Priority selection removed
      // Show priority selection with buttons
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievancePriority', session.language),
        [
          { id: 'priority_low', title: getTranslation('label_priority_low', session.language) },
          { id: 'priority_medium', title: getTranslation('label_priority_medium', session.language) },
          { id: 'priority_high', title: getTranslation('label_priority_high', session.language) }
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
      */
      
      // Skip priority and go directly to description
      await sendWhatsAppMessage(
        company,
        message.from,
        getTranslation('grievanceDescription', session.language)
      );
      session.step = 'grievance_description';
      await updateSession(session);
      break;

    /* Priority case commented out - see above */

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
      
      // Location step commented out - skip directly to photo
      /* 
      await sendWhatsAppButtons(
        company,
        message.from,
        getTranslation('grievanceLocation', session.language),
        [
          { id: 'location_skip', title: getTranslation('btn_skip_location', session.language) },
          { id: 'location_manual', title: getTranslation('btn_manual_location', session.language) }
        ]
      );
      
      session.step = 'grievance_location';
      await updateSession(session);
      */
      
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

    /* Location handling commented out
    case 'grievance_location':
      if (buttonId === 'location_skip' || userInput === 'skip') {
        session.data.address = undefined;
      } else if (buttonId === 'location_manual') {
        await sendWhatsAppMessage(
          company,
          message.from,
          getTranslation('msg_type_address', session.language)
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
          { id: 'photo_skip', title: getTranslation('btn_skip_photo', session.language) },
          { id: 'photo_upload', title: getTranslation('btn_upload_photo', session.language) }
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
          { id: 'photo_skip', title: getTranslation('btn_skip_photo', session.language) },
          { id: 'photo_upload', title: getTranslation('btn_upload_photo', session.language) }
        ]
      );
      session.step = 'grievance_photo';
      await updateSession(session);
      break;
    */

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
    
    // Manually generate grievanceId (pre-save hook not firing reliably)
    const grievanceCount = await Grievance.countDocuments({ companyId: company._id });
    const grievanceId = `GRV${String(grievanceCount + 1).padStart(8, '0')}`;
    
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
      .replace('{department}', deptName);

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
    
    // Manually generate appointmentId (pre-save hook not firing reliably)
    const appointmentCount = await Appointment.countDocuments({ companyId: company._id });
    const appointmentId = `APT${String(appointmentCount + 1).padStart(8, '0')}`;
    
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

