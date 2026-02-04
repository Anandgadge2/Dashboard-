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
  folder: string = 'ZP amravati'
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
        logger.info('🖼️  Detected as IMAGE');
      } else if (mimeType.startsWith('video/')) {
        resourceType = 'video';
        logger.info('🎥 Detected as VIDEO');
      } else if (
        // PDF files
        mimeType === 'application/pdf' ||
        // Microsoft Word
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        // Microsoft Excel
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        // Microsoft PowerPoint
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        // Text files
        mimeType === 'text/plain' ||
        mimeType === 'text/csv' ||
        // Archives
        mimeType === 'application/zip' ||
        mimeType === 'application/x-zip-compressed' ||
        mimeType === 'application/x-rar-compressed' ||
        // Generic document types (but not too broad)
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        mimeType.includes('excel') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('officedocument')
      ) {
        resourceType = 'raw'; // Use 'raw' for all documents
        logger.info('📄 Detected as DOCUMENT - using resource_type: raw');
      } else {
        logger.info(`⚠️  Unknown MIME type: ${mimeType} - using auto detection`);
      }
    }
    
    // Get file extension from MIME type
    const getExtensionFromMimeType = (mime: string): string => {
      const mimeMap: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'text/csv': 'csv',
        'application/zip': 'zip',
        'application/x-zip-compressed': 'zip',
        'application/x-rar-compressed': 'rar',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      return mimeMap[mime] || '';
    };
    
    const fileExtension = getExtensionFromMimeType(mimeType);
    logger.info(`📎 File extension: ${fileExtension || 'unknown'}`);
    
    logger.info(`📤 Uploading to Cloudinary with resource_type: ${resourceType}, folder: ${folder}`);
    
    // 4. Upload to Cloudinary using a buffer stream
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: folder,
        resource_type: resourceType,
        tags: ['whatsapp-chatbot', folder]
      };
      
      // For raw files, specify the format to preserve extension
      if (resourceType === 'raw' && fileExtension) {
        uploadOptions.format = fileExtension;
        logger.info(`📌 Setting format: ${fileExtension}`);
      }
      
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
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
