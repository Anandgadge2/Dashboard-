import express, { Request, Response } from 'express';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import Company from '../models/Company';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import { processWhatsAppMessage } from '../services/chatbotEngine';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction } from '../config/constants';

const router = express.Router();

// Webhook verification (GET request from WhatsApp)
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token (should match your WhatsApp app's verify token)
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Webhook endpoint (POST request from WhatsApp)
router.post('/', requireDatabaseConnection, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // WhatsApp sends a challenge first, then actual messages
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        // Process each message
        for (const message of value.messages) {
          await handleIncomingMessage(message, value.metadata);
        }
      }

      // Always return 200 to acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent WhatsApp from retrying
    res.status(200).send('ERROR_PROCESSED');
  }
});

async function handleIncomingMessage(message: any, metadata: any) {
  try {
    const phoneNumberId = metadata.phone_number_id;
    const from = message.from; // WhatsApp number
    const messageType = message.type;
    const messageId = message.id;

    // Find company by phoneNumberId
    const company = await Company.findOne({
      'whatsappConfig.phoneNumberId': phoneNumberId,
      isActive: true,
      isDeleted: false
    });

    if (!company) {
      console.log(`⚠️  No company found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    let messageText = '';
    let mediaUrl = '';

    // Extract message content based on type
    if (messageType === 'text') {
      messageText = message.text?.body || '';
    } else if (messageType === 'image') {
      messageText = message.image?.caption || '';
      mediaUrl = message.image?.id || '';
    } else if (messageType === 'document') {
      messageText = message.document?.caption || '';
      mediaUrl = message.document?.id || '';
    } else if (messageType === 'audio') {
      mediaUrl = message.audio?.id || '';
      messageText = 'Audio message';
    } else if (messageType === 'video') {
      messageText = message.video?.caption || '';
      mediaUrl = message.video?.id || '';
    }

    console.log(`📨 Received ${messageType} message from ${from} to company ${company.name}`);

    // Process message through chatbot engine
    const response = await processWhatsAppMessage({
      companyId: company._id.toString(),
      from,
      messageText,
      messageType,
      messageId,
      mediaUrl,
      metadata
    });

    // Log the interaction
    try {
      await logUserAction(
        { user: { _id: null, role: 'SYSTEM' } } as any,
        AuditAction.CREATE,
        'WhatsAppMessage',
        messageId,
        {
          companyId: company._id.toString(),
          from,
          messageType,
          messageText: messageText.substring(0, 100)
        }
      );
    } catch (auditError) {
      console.error('⚠️  Audit logging failed (non-critical):', auditError);
    }

    return response;
  } catch (error: any) {
    console.error('❌ Error handling incoming message:', error);
    throw error;
  }
}

export default router;
