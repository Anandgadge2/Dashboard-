import axios from 'axios';
import Company from '../models/Company';

export async function sendWhatsAppMessage(
  company: any,
  to: string,
  message: string
): Promise<any> {
  try {
    if (!company?.whatsappConfig?.phoneNumberId || !company?.whatsappConfig?.accessToken) {
      console.error('❌ WhatsApp not configured for company:', company?.name);
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `https://graph.facebook.com/v18.0/${company.whatsappConfig.phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${company.whatsappConfig.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: message
      }
    };

    const response = await axios.post(url, payload, { headers });
    
    console.log(`✅ WhatsApp message sent to ${to}`);
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppTemplate(
  company: any,
  to: string,
  templateName: string,
  parameters: string[] = []
): Promise<any> {
  try {
    if (!company?.whatsappConfig?.phoneNumberId || !company?.whatsappConfig?.accessToken) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `https://graph.facebook.com/v18.0/${company.whatsappConfig.phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${company.whatsappConfig.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload: any = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        }
      }
    };

    if (parameters.length > 0) {
      payload.template.components = [{
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: p }))
      }];
    }

    const response = await axios.post(url, payload, { headers });
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp template:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Send interactive buttons (list or button message)
export async function sendWhatsAppButtons(
  company: any,
  to: string,
  message: string,
  buttons: Array<{ id: string; title: string }>
): Promise<any> {
  try {
    if (!company?.whatsappConfig?.phoneNumberId || !company?.whatsappConfig?.accessToken) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `https://graph.facebook.com/v18.0/${company.whatsappConfig.phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${company.whatsappConfig.accessToken}`,
      'Content-Type': 'application/json'
    };

    // WhatsApp allows max 3 buttons
    const buttonList = buttons.slice(0, 3).map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title
      }
    }));

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message
        },
        action: {
          buttons: buttonList
        }
      }
    };

    const response = await axios.post(url, payload, { headers });
    console.log(`✅ WhatsApp buttons sent to ${to}`);
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp buttons:', error.response?.data || error.message);
    // Fallback to text message if buttons fail
    return await sendWhatsAppMessage(company, to, `${message}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`);
  }
}

// Send list message (for more than 3 options)
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
    if (!company?.whatsappConfig?.phoneNumberId || !company?.whatsappConfig?.accessToken) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `https://graph.facebook.com/v18.0/${company.whatsappConfig.phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${company.whatsappConfig.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: message
        },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    };

    const response = await axios.post(url, payload, { headers });
    console.log(`✅ WhatsApp list sent to ${to}`);
    return { success: true, messageId: response.data.messages?.[0]?.id };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp list:', error.response?.data || error.message);
    // Fallback to text message
    const textMessage = `${message}\n\n${sections.map(s => 
      `${s.title}:\n${s.rows.map((r, i) => `${i + 1}. ${r.title}`).join('\n')}`
    ).join('\n\n')}`;
    return await sendWhatsAppMessage(company, to, textMessage);
  }
}
