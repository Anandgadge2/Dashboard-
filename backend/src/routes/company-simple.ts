import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/rbac';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Simple test route
router.post('/test', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Test company creation endpoint hit');
    console.log('Request body:', req.body);
    
    const { name, companyType, contactEmail, contactPhone } = req.body;
    
    if (!name || !companyType || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Just return success for now
    return res.status(201).json({
      success: true,
      message: 'Company creation test successful',
      data: {
        company: {
          name,
          companyType,
          contactEmail,
          contactPhone,
          _id: 'test-id-' + Date.now()
        }
      }
    });
    
  } catch (error: any) {
    console.error('Test route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test route failed',
      error: error.message
    });
  }
});

export default router;
