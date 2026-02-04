import axios from 'axios';
import { cloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';

/**
 * Uploads media from WhatsApp to Cloudinary
 * 
 * @param mediaId The WhatsApp media ID
 * @param accessToken The WhatsApp access token
 * @param folder The Cloudinary folder to store the media in
 * @returns The secure URL of the uploaded media or null if failed
 */
export async function uploadWhatsAppMediaToCloudinary(
  mediaId: string, 
  accessToken: string,
  folder: string = 'ZP_Amravati'
): Promise<string | null> {
  try {
    if (!mediaId || !accessToken) {
      logger.error('❌ Missing mediaId or accessToken for upload');
      return null;
    }

    logger.info(`📥 Downloading WhatsApp media: ${mediaId}`);

    // 1. Get media URL from WhatsApp API
    const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const downloadUrl = mediaResponse.data.url;
    const mimeType = mediaResponse.data.mime_type; // Get MIME type from WhatsApp
    
    if (!downloadUrl) {
      logger.error('❌ WhatsApp media URL not found in response');
      return null;
    }
    
    logger.info(`📄 Media MIME type: ${mimeType}`);
    
    // 2. Download the media
    const fileResponse = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer'
    });
    
    const buffer = Buffer.from(fileResponse.data);
    logger.info(`📦 Downloaded file size: ${buffer.length} bytes`);
    
    // 3. Determine the correct resource_type based on MIME type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
    
    if (mimeType) {
      if (mimeType.startsWith('image/')) {
        resourceType = 'image';
      } else if (mimeType.startsWith('video/')) {
        resourceType = 'video';
      } else if (
        mimeType === 'application/pdf' ||
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        mimeType.includes('excel') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('officedocument') ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        resourceType = 'raw'; // Use 'raw' for documents
      }
    }
    
    logger.info(`📤 Uploading to Cloudinary with resource_type: ${resourceType}, folder: ${folder}`);
    
    // 4. Upload to Cloudinary using a buffer stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: resourceType,
          tags: ['whatsapp-chatbot', folder]
        },
        (error: any, result: any) => {
          if (error) {
            logger.error('❌ Cloudinary upload failed:', {
              error: error.message,
              code: error.http_code,
              details: error
            });
            resolve(null);
          } else {
            logger.info('✅ Cloudinary upload success:', {
              url: result?.secure_url,
              publicId: result?.public_id,
              format: result?.format,
              resourceType: result?.resource_type
            });
            resolve(result?.secure_url || null);
          }
        }
      );
      
      uploadStream.end(buffer);
    });
  } catch (error: any) {
    logger.error('❌ WhatsApp media upload to Cloudinary failed:', error.message);
    if (error.response) {
      logger.error('API Error Response:', JSON.stringify(error.response.data));
    }
    return null;
  }
}
