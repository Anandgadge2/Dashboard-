// Test script to verify Cloudinary document upload
// Run this to test if documents are being uploaded correctly

import { uploadWhatsAppMediaToCloudinary } from './services/mediaService';
import { logger } from './config/logger';

async function testDocumentUpload() {
  logger.info('🧪 Testing Cloudinary document upload...');
  
  // This would test with a real WhatsApp media ID
  // You need to replace with actual values from WhatsApp
  const testMediaId = 'YOUR_WHATSAPP_MEDIA_ID';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  
  if (!accessToken) {
    logger.error('❌ WHATSAPP_ACCESS_TOKEN not found in environment');
    return;
  }
  
  logger.info('📤 Attempting upload...');
  const result = await uploadWhatsAppMediaToCloudinary(testMediaId, accessToken, 'ZP amravati');
  
  if (result) {
    logger.info('✅ Upload successful!');
    logger.info('URL:', result);
  } else {
    logger.error('❌ Upload failed!');
  }
}

// Uncomment to run:
// testDocumentUpload();

export { testDocumentUpload };
