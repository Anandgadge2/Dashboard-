import express, { Request, Response } from 'express';
import multer from 'multer';
import { cloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';
import { authenticate } from '../middleware/auth';
import { requireDatabaseConnection } from '../middleware/dbConnection';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.use(requireDatabaseConnection);
router.use(authenticate);

// @route   POST /api/uploads
// @desc    Upload a resolution document to Cloudinary
// @access  Private
router.post('/', upload.single('document'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const file = req.file;
    const folder = 'resolution-documents';

    // Determine resource type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype === 'application/pdf') {
      resourceType = 'image'; // PDF as image for better compatibility in Cloudinary
    } else {
      resourceType = 'raw';
    }

    logger.info(`📤 Uploading document to Cloudinary: ${file.originalname} (${file.mimetype})`);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
          tags: ['resolution-document']
        },
        (error, result) => {
          if (error) {
            logger.error('❌ Cloudinary upload failed:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(file.buffer);
    });

    const uploadResult = result as any;

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    });

  } catch (error: any) {
    logger.error('❌ Document upload failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

export default router;
