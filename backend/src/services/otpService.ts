import OTP from '../models/OTP';
import { sendWhatsAppMessage } from './whatsappService';

// Generate random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in database
export async function createOTP(phoneNumber: string): Promise<string> {
  // Delete any existing OTPs for this phone number
  await OTP.deleteMany({ phoneNumber, verified: false });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.create({
    phoneNumber,
    otp,
    expiresAt,
    verified: false,
    attempts: 0
  });

  return otp;
}

// Verify OTP
export async function verifyOTP(phoneNumber: string, providedOTP: string): Promise<boolean> {
  const otpRecord = await OTP.findOne({
    phoneNumber,
    verified: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return false;
  }

  // Increment attempts
  otpRecord.attempts += 1;
  await otpRecord.save();

  if (otpRecord.attempts > 5) {
    // Too many attempts, invalidate OTP
    await OTP.deleteMany({ phoneNumber, verified: false });
    return false;
  }

  if (otpRecord.otp === providedOTP) {
    otpRecord.verified = true;
    await otpRecord.save();
    return true;
  }

  return false;
}

// Send OTP via WhatsApp
export async function sendOTP(company: any, phoneNumber: string, language: string = 'en'): Promise<boolean> {
  const otp = await createOTP(phoneNumber);

  const messages: Record<string, string> = {
    en: `Your verification code is: *${otp}*\n\nThis code will expire in 10 minutes.\n\nPlease enter this code to continue.`,
    hi: `आपका सत्यापन कोड है: *${otp}*\n\nयह कोड 10 मिनट में समाप्त हो जाएगा।\n\nकृपया जारी रखने के लिए इस कोड को दर्ज करें।`,
    mr: `तुमचा सत्यापन कोड आहे: *${otp}*\n\nहा कोड 10 मिनिटांत कालबाह्य होईल.\n\nकृपया सुरू ठेवण्यासाठी हा कोड प्रविष्ट करा.`
  };

  const message = messages[language] || messages.en;
  const result = await sendWhatsAppMessage(company, phoneNumber, message);
  return result.success;
}

// Check if phone number is verified
export async function isPhoneVerified(phoneNumber: string): Promise<boolean> {
  const verifiedOTP = await OTP.findOne({
    phoneNumber,
    verified: true
  }).sort({ createdAt: -1 });

  if (!verifiedOTP) {
    return false;
  }

  // Check if verification is still valid (24 hours)
  const verificationAge = Date.now() - verifiedOTP.createdAt.getTime();
  return verificationAge < 24 * 60 * 60 * 1000; // 24 hours
}
