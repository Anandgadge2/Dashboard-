import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Company from '../models/Company';
import { processWhatsAppMessage } from '../services/chatbotEngine';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction } from '../config/constants';

const router = express.Router();

// Test endpoint to verify route is accessible
// Also handles WhatsApp webhook verification if called with verification parameters
router.get('/test', (req: Request, res: Response) => {
  // Check if this is a WhatsApp verification request
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && challenge) {
    // This is a WhatsApp verification request
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
    
    console.log('');
    console.log('='.repeat(60));
    console.log('🔍 WEBHOOK VERIFICATION REQUEST (via /test endpoint)');
    console.log('='.repeat(60));
    console.log(`   Mode: ${mode}`);
    console.log(`   Token provided: ${token}`);
    console.log(`   Expected token: ${verifyToken}`);
    console.log(`   Challenge: ${challenge}`);
    console.log('='.repeat(60));
    
    if (token === verifyToken) {
      console.log('✅ VERIFICATION SUCCESSFUL via /test endpoint!');
      console.log('='.repeat(60));
      console.log('');
      res.status(200).send(challenge);
      return;
    } else {
      console.log('❌ VERIFICATION FAILED - Token mismatch');
      console.log('='.repeat(60));
      console.log('');
      res.status(403).send('Forbidden');
      return;
    }
  }

  // Regular test endpoint response
  res.json({
    success: true,
    message: 'Webhook route is working!',
    timestamp: new Date().toISOString(),
    path: '/webhook/test',
    note: 'For WhatsApp verification, use /webhook (without /test)'
  });
});

// Check database connection before processing
const checkDatabase = (_req: Request, res: Response, next: () => void) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('❌ Database not connected, cannot process webhook');
    // Still return 200 to prevent WhatsApp retries
    res.status(200).send('DATABASE_UNAVAILABLE');
    return;
  }
  next();
};

// Webhook verification (GET request from WhatsApp)
// This endpoint is called by WhatsApp Cloud API to verify the webhook
router.get('/', (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'zillaparishadbot_verify';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Webhook endpoint (POST request from WhatsApp)
// Note: This route should NOT require authentication as it's called by WhatsApp
router.post('/', checkDatabase, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log('📥 Webhook POST received:', JSON.stringify(body, null, 2).substring(0, 500));

    // WhatsApp sends a challenge first, then actual messages
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      console.log(`📨 Processing webhook: entry=${entry ? 'found' : 'missing'}, changes=${changes ? 'found' : 'missing'}`);

      if (value?.messages) {
        console.log(`📬 Found ${value.messages.length} message(s) to process`);
        
        // Process each message
        for (const message of value.messages) {
          try {
            // Handle interactive messages (button clicks, list selections)
            if (message.type === 'interactive') {
              console.log('🔘 Processing interactive message');
              await handleInteractiveMessage(message, value.metadata);
            } else {
              // Handle regular messages (text, image, etc.)
              console.log(`📝 Processing ${message.type} message`);
              await handleIncomingMessage(message, value.metadata);
            }
          } catch (msgError: any) {
            console.error(`❌ Error processing individual message:`, msgError);
            // Continue processing other messages
          }
        }
      } else {
        console.log('ℹ️  No messages in webhook payload (might be status update)');
      }

      // Always return 200 to acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');
    } else {
      console.log(`⚠️  Unknown webhook object type: ${body.object}`);
      res.sendStatus(404);
    }
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    console.error('Error stack:', error.stack);
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

async function handleInteractiveMessage(message: any, metadata: any) {
  try {
    const phoneNumberId = metadata.phone_number_id;
    const from = message.from;
    const messageId = message.id;
    const interactive = message.interactive;

    // Find company
    const company = await Company.findOne({
      'whatsappConfig.phoneNumberId': phoneNumberId,
      isActive: true,
      isDeleted: false
    });

    if (!company) {
      console.log(`⚠️  No company found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    let buttonId = '';
    let messageText = '';

    // Handle button reply
    if (interactive?.type === 'button_reply') {
      buttonId = interactive.button_reply?.id || '';
      messageText = interactive.button_reply?.title || '';
      console.log(`🔘 Button clicked: ${buttonId} by ${from}`);
    }

    // Handle list reply
    if (interactive?.type === 'list_reply') {
      buttonId = interactive.list_reply?.id || '';
      messageText = interactive.list_reply?.title || '';
      console.log(`📋 List item selected: ${buttonId} by ${from}`);
    }

    if (buttonId) {
      // Process button click through chatbot engine
      const response = await processWhatsAppMessage({
        companyId: company._id.toString(),
        from,
        messageText,
        messageType: 'interactive',
        messageId,
        metadata,
        buttonId
      });

      // Log the interaction
      try {
        await logUserAction(
          { user: { _id: null, role: 'SYSTEM' } } as any,
          AuditAction.CREATE,
          'WhatsAppButtonClick',
          messageId,
          {
            companyId: company._id.toString(),
            from,
            buttonId,
            messageText
          }
        );
      } catch (auditError) {
        console.error('⚠️  Audit logging failed (non-critical):', auditError);
      }

      return response;
    }

  } catch (error: any) {
    console.error('❌ Error handling interactive message:', error);
    throw error;
  }
}

export default router;
