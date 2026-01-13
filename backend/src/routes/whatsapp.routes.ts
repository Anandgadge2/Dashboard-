import express, { Request, Response } from 'express';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { processWhatsAppMessage } from '../services/chatbotEngine';

const router = express.Router();

/**
 * ============================================================
 * WEBHOOK VERIFICATION (GET)
 * ============================================================
 */
router.get('/', (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * ============================================================
 * WEBHOOK RECEIVER (POST)
 * ============================================================
 */
router.post('/', requireDatabaseConnection, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    console.log(
      '📥 Webhook POST received:',
      JSON.stringify(body, null, 2).substring(0, 500)
    );

    if (body.object !== 'whatsapp_business_account') {
      console.log(`⚠️ Unknown webhook object: ${body.object}`);
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    console.log(
      `📨 Processing webhook: entry=${!!entry}, changes=${!!changes}`
    );

    if (!value?.messages) {
      console.log('ℹ️ No messages (status update or delivery receipt)');
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const message of value.messages) {
      try {
        if (message.type === 'interactive') {
          console.log('🔘 Interactive message received');
          await handleInteractiveMessage(message, value.metadata);
        } else {
          console.log(`📝 ${message.type} message received`);
          await handleIncomingMessage(message, value.metadata);
        }
      } catch (msgErr) {
        console.error('❌ Error processing message:', msgErr);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (error: any) {
    console.error('❌ Webhook processing failed:', error);
    return res.status(200).send('ERROR_PROCESSED');
  }
});

/**
 * ============================================================
 * ZP AMRAVATI CONTEXT (SINGLE-TENANT)
 * ============================================================
 * This chatbot exclusively serves Zilla Parishad Amravati.
 * Every message is implicitly from a ZP Amravati citizen.
 * No company validation or selection is performed.
 */
function getZPAmravatiContext() {
  return {
    _id: '000000000000000000000001',
    name: 'Zilla Parishad Amravati',
    companyId: 'CMP000001',
    enabledModules: ['GRIEVANCE', 'APPOINTMENT'],
    whatsappConfig: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN
    }
  } as any;
}

/**
 * ============================================================
 * HANDLE NORMAL MESSAGES
 * ============================================================
 */
async function handleIncomingMessage(message: any, metadata: any) {
  const company = getZPAmravatiContext();

  const from = message.from;
  const messageId = message.id;
  const messageType = message.type;

  let messageText = '';
  let mediaUrl = '';

  if (messageType === 'text') {
    messageText = message.text?.body || '';
  } else if (messageType === 'image') {
    messageText = message.image?.caption || '';
    mediaUrl = message.image?.id || '';
  } else if (messageType === 'document') {
    messageText = message.document?.caption || '';
    mediaUrl = message.document?.id || '';
  } else if (messageType === 'audio' || messageType === 'voice') {
    mediaUrl = message.audio?.id || message.voice?.id || '';
  } else if (messageType === 'video') {
    messageText = message.video?.caption || '';
    mediaUrl = message.video?.id || '';
  }

  console.log(
    `📨 Message from ${from} → Company: ${company.name}`
  );

  const response = await processWhatsAppMessage({
    companyId: company.companyId,
    from,
    messageText,
    messageType,
    messageId,
    mediaUrl,
    metadata
  });

  return response;
}

/**
 * ============================================================
 * HANDLE INTERACTIVE MESSAGES
 * ============================================================
 */
async function handleInteractiveMessage(message: any, metadata: any) {
  const company = getZPAmravatiContext();

  const from = message.from;
  const messageId = message.id;
  const interactive = message.interactive;

  let buttonId = '';
  let messageText = '';

  if (interactive?.type === 'button_reply') {
    buttonId = interactive.button_reply?.id || '';
    messageText = interactive.button_reply?.title || '';
  }

  if (interactive?.type === 'list_reply') {
    buttonId = interactive.list_reply?.id || '';
    messageText = interactive.list_reply?.title || '';
  }

  if (!buttonId) return;

  console.log(`🔘 Button "${buttonId}" clicked by ${from}`);

  const response = await processWhatsAppMessage({
    companyId: company.companyId,
    from,
    messageText,
    messageType: 'interactive',
    messageId,
    metadata,
    buttonId
  });

  return response;
}

export default router;
