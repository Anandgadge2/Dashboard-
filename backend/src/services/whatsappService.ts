import axios from 'axios';

/**
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function getWhatsAppConfig(company: any) {
  const phoneNumberId = company?.whatsappConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = company?.whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  // HARDCODED FALLBACK (Last Resort)
  // Used if both DB and ENV fail, to match user's previous context
  const fallbackPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const fallbackToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const finalPhoneId = phoneNumberId || fallbackPhoneId;
  const finalToken = accessToken || fallbackToken;

  if (!finalPhoneId || !finalToken) {
    throw new Error(`WhatsApp not configured for company: ${company?.name || 'System'}`);
  }

  return {
    url: `https://graph.facebook.com/v18.0/${finalPhoneId}/messages`,
    headers: {
      Authorization: `Bearer ${finalToken}`,
      'Content-Type': 'application/json'
    }
  };
}

function safeText(text: string, limit = 4000): string {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit - 10) + '…' : text;
}

function logMetaError(error: any, context: Record<string, any>) {
  const metaError = error?.response?.data?.error;

  console.error('❌ WhatsApp API Error', {
    ...context,
    metaCode: metaError?.code,
    metaMessage: metaError?.message,
    fbtraceId: metaError?.fbtrace_id
  });
}

/**
 * ============================================================
 * SEND TEXT MESSAGE
 * ============================================================
 */
export async function sendWhatsAppMessage(
  company: any,
  to: string,
  message: string
): Promise<any> {
  try {
    const { url, headers } = getWhatsAppConfig(company);

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: safeText(message)
      }
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ WhatsApp text sent → ${to}`);
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };

  } catch (error: any) {
    logMetaError(error, {
      action: 'send_text',
      to,
      company: company?.name
    });

    return {
      success: false,
      error: error?.response?.data?.error?.message || error.message
    };
  }
}

/**
 * ============================================================
 * SEND TEMPLATE MESSAGE (24-HOUR SAFE)
 * ============================================================
 */
export async function sendWhatsAppTemplate(
  company: any,
  to: string,
  templateName: string,
  parameters: string[] = [],
  language: 'en' | 'hi' | 'mr' = 'en'
): Promise<any> {
  try {
    const { url, headers } = getWhatsAppConfig(company);

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language }
      }
    };

    if (parameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: parameters.map(p => ({
            type: 'text',
            text: safeText(p, 1000)
          }))
        }
      ];
    }

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ WhatsApp template sent → ${to}`);
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };

  } catch (error: any) {
    logMetaError(error, {
      action: 'send_template',
      templateName,
      to,
      company: company?.name
    });

    return {
      success: false,
      error: error?.response?.data?.error?.message || error.message
    };
  }
}

/**
 * ============================================================
 * SEND BUTTON MESSAGE (MAX 3 BUTTONS)
 * ============================================================
 */
export async function sendWhatsAppButtons(
  company: any,
  to: string,
  message: string,
  buttons: Array<{ id: string; title: string }>
): Promise<any> {
  try {
    const { url, headers } = getWhatsAppConfig(company);

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: safeText(message)
        },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      }
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ WhatsApp buttons sent → ${to}`);
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };

  } catch (error: any) {
    logMetaError(error, {
      action: 'send_buttons',
      to,
      company: company?.name
    });

    // Fallback to plain text
    const fallbackText =
      safeText(message) +
      '\n\n' +
      buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');

    return sendWhatsAppMessage(company, to, fallbackText);
  }
}

/**
 * ============================================================
 * SEND LIST MESSAGE
 * ============================================================
 */
export async function sendWhatsAppList(
  company: any,
  to: string,
  message: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
): Promise<any> {
  try {
    const { url, headers } = getWhatsAppConfig(company);

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: safeText(message)
        },
        action: {
          button: buttonText,
          sections
        }
      }
    };

    const response = await axios.post(url, payload, { headers });

    console.log(`✅ WhatsApp list sent → ${to}`);
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id
    };

  } catch (error: any) {
    logMetaError(error, {
      action: 'send_list',
      to,
      company: company?.name
    });

    // Fallback to text
    const fallbackText =
      safeText(message) +
      '\n\n' +
      sections
        .map(section =>
          `${section.title}\n` +
          section.rows.map((r, i) => `${i + 1}. ${r.title}`).join('\n')
        )
        .join('\n\n');

    return sendWhatsAppMessage(company, to, fallbackText);
  }
}
