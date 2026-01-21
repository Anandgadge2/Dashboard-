import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { logger } from '../config/logger';

/**
 * Reusable SMTP transporter (singleton)
 */
let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

/**
 * Create or reuse transporter
 */
const createTransporter = (): Transporter<SMTPTransport.SentMessageInfo> => {
  if (transporter) return transporter;

  const port: number = Number(process.env.SMTP_PORT ?? 465);
  const isSecure: boolean = port === 465;

  const options: SMTPTransport.Options = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: isSecure,        // 465 → implicit TLS, 587 → STARTTLS
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: true // MUST be true in production
    }
  };

  transporter = nodemailer.createTransport(options);
  return transporter;
};

/**
 * Send email notification
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const errorMsg = 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
      logger.warn(`⚠️ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // Validate email address
    const recipients = Array.isArray(to) ? to : [to];
    const invalidEmails = recipients.filter(email => !email || !email.includes('@'));
    if (invalidEmails.length > 0) {
      const errorMsg = `Invalid email address(es): ${invalidEmails.join(', ')}`;
      logger.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const transport = createTransporter();

    const mailOptions: SendMailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Zilla Parishad Amravati'}" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject,
      text: text ?? subject,
      html
    };

    logger.info(`📧 Attempting to send email to: ${recipients.join(', ')}`);
    const info = await transport.sendMail(mailOptions);
    logger.info(`✅ Email sent successfully to ${recipients.join(', ')} - Message ID: ${info.messageId}`);

    return { success: true };
  } catch (err: any) {
    let errorMessage = 'Unknown email error';
    
    if (err instanceof Error) {
      errorMessage = err.message;
      
      // Provide more helpful error messages
      if (err.message.includes('Invalid login')) {
        errorMessage = 'Invalid SMTP credentials. Please check SMTP_USER and SMTP_PASS.';
      } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        errorMessage = `Cannot connect to SMTP server (${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 465}). Check network and SMTP settings.`;
      } else if (err.message.includes('self signed certificate')) {
        errorMessage = 'SMTP server certificate validation failed. Check TLS settings.';
      }
    }

    logger.error(`❌ Failed to send email to ${Array.isArray(to) ? to.join(', ') : to}:`, {
      error: errorMessage,
      details: err
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return {
        success: false,
        error: 'SMTP credentials not configured',
        details: {
          SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Missing',
          SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Missing',
          SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
          SMTP_PORT: process.env.SMTP_PORT || '465 (default)'
        }
      };
    }

    const transport = createTransporter();
    
    // Test connection by verifying credentials
    await transport.verify();
    
    return {
      success: true,
      details: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '465',
        user: process.env.SMTP_USER,
        fromName: process.env.SMTP_FROM_NAME || 'Zilla Parishad Amravati'
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      details: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '465',
        user: process.env.SMTP_USER,
        error: err
      }
    };
  }
}

/**
 * Generate HTML email template for grievance/appointment notifications
 */
export function generateNotificationEmail(
  type: 'grievance' | 'appointment',
  action: 'created' | 'assigned' | 'resolved',
  data: any
): { subject: string; html: string; text: string } {
  const companyName = data.companyName || 'Zilla Parishad Amravati';

  if (action === 'created' && type === 'grievance') {
    return {
      subject: `New Grievance Received - ${data.grievanceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f4c81; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #0f4c81; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Grievance Received</h2>
            </div>
            <div class="content">
              <p>Dear ${data.recipientName},</p>
              <p>A new grievance has been received and assigned to your department.</p>
              <div class="detail-row"><span class="label">Grievance ID:</span> ${data.grievanceId}</div>
              <div class="detail-row"><span class="label">Citizen Name:</span> ${data.citizenName}</div>
              <div class="detail-row"><span class="label">Phone:</span> ${data.citizenPhone}</div>
              <div class="detail-row"><span class="label">Department:</span> ${data.departmentName}</div>
              <div class="detail-row"><span class="label">Category:</span> ${data.category || 'N/A'}</div>
              <div class="detail-row"><span class="label">Priority:</span> ${data.priority || 'MEDIUM'}</div>
              <div class="detail-row"><span class="label">Description:</span><br/>${data.description}</div>
              ${data.location ? `<div class="detail-row"><span class="label">Location:</span> ${data.location}</div>` : ''}
            </div>
            <div class="footer">
              <p>${companyName} - Digital Portal</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New Grievance Received\n\nGrievance ID: ${data.grievanceId}\nCitizen: ${data.citizenName}\nPhone: ${data.citizenPhone}\nDepartment: ${data.departmentName}\nDescription: ${data.description}`
    };
  }

  if (action === 'assigned' && type === 'grievance') {
    return {
      subject: `Grievance Assigned to You - ${data.grievanceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #1a73e8; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Grievance Assigned to You</h2>
            </div>
            <div class="content">
              <p>Dear ${data.recipientName},</p>
              <p>A grievance has been assigned to you for resolution.</p>
              <div class="detail-row"><span class="label">Grievance ID:</span> ${data.grievanceId}</div>
              <div class="detail-row"><span class="label">Citizen Name:</span> ${data.citizenName}</div>
              <div class="detail-row"><span class="label">Phone:</span> ${data.citizenPhone}</div>
              <div class="detail-row"><span class="label">Department:</span> ${data.departmentName}</div>
              <div class="detail-row"><span class="label">Priority:</span> ${data.priority || 'MEDIUM'}</div>
              <div class="detail-row"><span class="label">Description:</span><br/>${data.description}</div>
              ${data.assignedByName ? `<div class="detail-row"><span class="label">Assigned by:</span> ${data.assignedByName}</div>` : ''}
            </div>
            <div class="footer">
              <p>${companyName} - Digital Portal</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Grievance Assigned to You\n\nGrievance ID: ${data.grievanceId}\nCitizen: ${data.citizenName}\nPhone: ${data.citizenPhone}\nDepartment: ${data.departmentName}\nDescription: ${data.description}`
    };
  }

  if (action === 'resolved' && type === 'grievance') {
    return {
      subject: `Grievance Resolved - ${data.grievanceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #28a745; }
            .remarks { background: white; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Grievance Resolved</h2>
            </div>
            <div class="content">
              <p>Dear ${data.recipientName},</p>
              <p>The following grievance has been resolved.</p>
              <div class="detail-row"><span class="label">Grievance ID:</span> ${data.grievanceId}</div>
              <div class="detail-row"><span class="label">Citizen Name:</span> ${data.citizenName}</div>
              <div class="detail-row"><span class="label">Department:</span> ${data.departmentName || 'N/A'}</div>
              <div class="detail-row"><span class="label">Status:</span> Resolved</div>
              ${data.remarks ? `<div class="remarks"><strong>Officer Remarks:</strong><br/>${data.remarks}</div>` : ''}
            </div>
            <div class="footer">
              <p>${companyName} - Digital Portal</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Grievance Resolved\n\nGrievance ID: ${data.grievanceId}\nCitizen: ${data.citizenName}\nDepartment: ${data.departmentName || 'N/A'}\nStatus: Resolved\n${data.remarks ? `Remarks: ${data.remarks}` : ''}`
    };
  }

  // Default template
  return {
    subject: 'Notification from ' + companyName,
    html: `<p>${JSON.stringify(data)}</p>`,
    text: JSON.stringify(data)
  };
}
