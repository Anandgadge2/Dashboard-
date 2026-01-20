import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

// Create reusable transporter
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
    // For STARTTLS (port 587), requireTLS ensures encryption is used
    requireTLS: !isSecure && port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Additional options for better compatibility
    tls: {
      // Do not fail on invalid certificates (useful for testing with Ethereal)
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

/**
 * Send email notification
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured. Email not sent.');
      return { success: false, error: 'SMTP not configured' };
    }

    const transporter = createTransporter();
    const recipients = Array.isArray(to) ? to : [to];

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Zilla Parishad Amravati'}" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject,
      text: text || subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent to ${recipients.join(', ')}: ${info.messageId}`);
    
    return { success: true };
  } catch (error: any) {
    logger.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
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
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/grievances/${data.grievanceId}" 
                   style="background: #0f4c81; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Grievance
                </a>
              </p>
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
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/grievances/${data.grievanceId}" 
                   style="background: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View & Resolve
                </a>
              </p>
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
      subject: `Your Grievance Has Been Resolved - ${data.grievanceId}`,
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
              <p>Dear ${data.citizenName},</p>
              <p>Your grievance has been successfully resolved.</p>
              <div class="detail-row"><span class="label">Grievance ID:</span> ${data.grievanceId}</div>
              <div class="detail-row"><span class="label">Department:</span> ${data.departmentName}</div>
              <div class="detail-row"><span class="label">Status:</span> Resolved</div>
              ${data.remarks ? `<div class="remarks"><strong>Officer Remarks:</strong><br/>${data.remarks}</div>` : ''}
              <p>Thank you for your patience. We hope this resolves your concern.</p>
            </div>
            <div class="footer">
              <p>${companyName} - Digital Portal</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your Grievance Has Been Resolved\n\nGrievance ID: ${data.grievanceId}\nDepartment: ${data.departmentName}\nStatus: Resolved\n${data.remarks ? `Remarks: ${data.remarks}` : ''}`
    };
  }

  // Default template
  return {
    subject: 'Notification from ' + companyName,
    html: `<p>${JSON.stringify(data)}</p>`,
    text: JSON.stringify(data)
  };
}
