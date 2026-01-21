// import Company from '../models/Company';
// import Department from '../models/Department';
// import User from '../models/User';
// import { sendEmail, generateNotificationEmail } from './emailService';
// import { sendWhatsAppMessage } from './whatsappService';
// import { logger } from '../config/logger';
// import { UserRole } from '../config/constants';

// /**
//  * Notification Service
//  * Handles email and WhatsApp notifications for grievances and appointments
//  */

// interface NotificationData {
//   type: 'grievance' | 'appointment';
//   action: 'created' | 'assigned' | 'resolved';
//   grievanceId?: string;
//   appointmentId?: string;
//   citizenName: string;
//   citizenPhone: string;
//   citizenWhatsApp?: string;
//   departmentId?: any;
//   companyId: any;
//   description?: string;
//   purpose?: string;
//   category?: string;
//   priority?: string;
//   location?: string;
//   remarks?: string;
//   assignedTo?: any;
//   assignedByName?: string;
// }

// /**
//  * Get department admin for a department
//  */
// async function getDepartmentAdmin(departmentId: any): Promise<any> {
//   try {
//     const department = await Department.findById(departmentId);
//     if (!department) return null;

//     const admin = await User.findOne({
//       departmentId: departmentId,
//       role: UserRole.DEPARTMENT_ADMIN,
//       isActive: true,
//       isDeleted: false
//     });

//     return admin;
//   } catch (error) {
//     logger.error('Error getting department admin:', error);
//     return null;
//   }
// }

// /**
//  * Send notification to department admin when grievance/appointment is created
//  */
// export async function notifyDepartmentAdminOnCreation(data: NotificationData): Promise<void> {
//   try {
//     const company = await Company.findById(data.companyId);
//     if (!company) {
//       logger.warn('Company not found for notification');
//       return;
//     }

//     const department = await Department.findById(data.departmentId);
//     if (!department) {
//       logger.warn('Department not found for notification');
//       return;
//     }

//     const departmentAdmin = await getDepartmentAdmin(data.departmentId);
//     if (!departmentAdmin || !departmentAdmin.email) {
//       logger.warn(`No department admin found for department ${department.name}`);
//       return;
//     }

//     // Prepare notification data
//     const notificationData = {
//       companyName: company.name,
//       recipientName: departmentAdmin.getFullName(),
//       grievanceId: data.grievanceId || data.appointmentId,
//       citizenName: data.citizenName,
//       citizenPhone: data.citizenPhone,
//       departmentName: department.name,
//       category: data.category,
//       priority: data.priority,
//       description: data.description || data.purpose,
//       location: data.location
//     };

//     // Send email
//     const emailTemplate = generateNotificationEmail(data.type, 'created', notificationData);
//     await sendEmail(
//       departmentAdmin.email,
//       emailTemplate.subject,
//       emailTemplate.html,
//       emailTemplate.text
//     );

//     // Send WhatsApp if phone number available
//     if (departmentAdmin.phone && company.whatsappConfig) {
//       const whatsappMessage = `📋 *New ${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Received*\n\n` +
//         `🎫 *ID:* ${data.grievanceId || data.appointmentId}\n` +
//         `👤 *Citizen:* ${data.citizenName}\n` +
//         `📞 *Phone:* ${data.citizenPhone}\n` +
//         `🏢 *Department:* ${department.name}\n` +
//         `${data.category ? `📂 *Category:* ${data.category}\n` : ''}` +
//         `${data.priority ? `⚡ *Priority:* ${data.priority}\n` : ''}` +
//         `📝 *Details:* ${data.description || data.purpose}\n\n` +
//         `Please review and take necessary action.`;

//       await sendWhatsAppMessage(company, departmentAdmin.phone, whatsappMessage);
//     }

//     logger.info(`✅ Notified department admin ${departmentAdmin.getFullName()} about new ${data.type}`);
//   } catch (error: any) {
//     logger.error(`❌ Failed to notify department admin:`, error);
//   }
// }

// /**
//  * Send notification to assigned user when grievance/appointment is assigned
//  */
// export async function notifyUserOnAssignment(data: NotificationData): Promise<void> {
//   try {
//     const company = await Company.findById(data.companyId);
//     if (!company) {
//       logger.warn('Company not found for notification');
//       return;
//     }

//     const assignedUser = await User.findById(data.assignedTo);
//     if (!assignedUser) {
//       logger.warn('Assigned user not found for notification');
//       return;
//     }

//     const department = await Department.findById(data.departmentId);
//     const departmentName = department?.name || 'Unknown Department';

//     // Prepare notification data
//     const notificationData = {
//       companyName: company.name,
//       recipientName: assignedUser.getFullName(),
//       grievanceId: data.grievanceId || data.appointmentId,
//       citizenName: data.citizenName,
//       citizenPhone: data.citizenPhone,
//       departmentName,
//       category: data.category,
//       priority: data.priority,
//       description: data.description || data.purpose,
//       location: data.location,
//       assignedByName: data.assignedByName || 'System'
//     };

//     // Send email if user has email
//     if (assignedUser.email) {
//       const emailTemplate = generateNotificationEmail(data.type, 'assigned', notificationData);
//       await sendEmail(
//         assignedUser.email,
//         emailTemplate.subject,
//         emailTemplate.html,
//         emailTemplate.text
//       );
//     }

//     // Send WhatsApp if phone number available
//     if (assignedUser.phone && company.whatsappConfig) {
//       const whatsappMessage = `📋 *${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Assigned to You*\n\n` +
//         `🎫 *ID:* ${data.grievanceId || data.appointmentId}\n` +
//         `👤 *Citizen:* ${data.citizenName}\n` +
//         `📞 *Phone:* ${data.citizenPhone}\n` +
//         `🏢 *Department:* ${departmentName}\n` +
//         `${data.priority ? `⚡ *Priority:* ${data.priority}\n` : ''}` +
//         `📝 *Details:* ${data.description || data.purpose}\n` +
//         `👨‍💼 *Assigned by:* ${data.assignedByName}\n\n` +
//         `Please review and take necessary action.`;

//       await sendWhatsAppMessage(company, assignedUser.phone, whatsappMessage);
//     }

//     logger.info(`✅ Notified user ${assignedUser.getFullName()} about ${data.type} assignment`);
//   } catch (error: any) {
//     logger.error(`❌ Failed to notify assigned user:`, error);
//   }
// }

// /**
//  * Send notification to citizen when grievance/appointment is resolved
//  */
// export async function notifyCitizenOnResolution(data: NotificationData): Promise<void> {
//   try {
//     const company = await Company.findById(data.companyId);
//     if (!company) {
//       logger.warn('Company not found for notification');
//       return;
//     }

//     const department = await Department.findById(data.departmentId);
//     const departmentName = department?.name || 'Unknown Department';

//     // Prepare notification data
//     const notificationData = {
//       companyName: company.name,
//       citizenName: data.citizenName,
//       grievanceId: data.grievanceId || data.appointmentId,
//       departmentName,
//       remarks: data.remarks
//     };

//     // Send email if citizen has email (for appointments)
//     if (data.type === 'appointment' && (data as any).citizenEmail) {
//       const emailTemplate = generateNotificationEmail(data.type, 'resolved', notificationData);
//       await sendEmail(
//         (data as any).citizenEmail,
//         emailTemplate.subject,
//         emailTemplate.html,
//         emailTemplate.text
//       );
//     }

//     // Send WhatsApp to citizen
//     if (data.citizenWhatsApp && company.whatsappConfig) {
//       const whatsappMessage = `✅ *Your ${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Has Been Resolved*\n\n` +
//         `🎫 *Reference ID:* ${data.grievanceId || data.appointmentId}\n` +
//         `🏢 *Department:* ${departmentName}\n` +
//         `📊 *Status:* Resolved\n` +
//         `${data.remarks ? `\n📝 *Officer Remarks:*\n${data.remarks}\n` : ''}` +
//         `\nThank you for your patience. We hope this resolves your concern.`;

//       await sendWhatsAppMessage(company, data.citizenWhatsApp, whatsappMessage);
//     } else if (data.citizenPhone && company.whatsappConfig) {
//       // Fallback to phone number if WhatsApp number not set
//       const whatsappMessage = `✅ *Your ${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Has Been Resolved*\n\n` +
//         `🎫 *Reference ID:* ${data.grievanceId || data.appointmentId}\n` +
//         `🏢 *Department:* ${departmentName}\n` +
//         `📊 *Status:* Resolved\n` +
//         `${data.remarks ? `\n📝 *Officer Remarks:*\n${data.remarks}\n` : ''}` +
//         `\nThank you for your patience. We hope this resolves your concern.`;

//       await sendWhatsAppMessage(company, data.citizenPhone, whatsappMessage);
//     }

//     logger.info(`✅ Notified citizen ${data.citizenName} about ${data.type} resolution`);
//   } catch (error: any) {
//     logger.error(`❌ Failed to notify citizen:`, error);
//   }
// }

// /**
//  * Notify all hierarchy members about status change
//  */
// export async function notifyHierarchyOnStatusChange(
//   data: NotificationData,
//   oldStatus: string,
//   newStatus: string
// ): Promise<void> {
//   try {
//     const company = await Company.findById(data.companyId);
//     if (!company) return;

//     const department = await Department.findById(data.departmentId);
//     const departmentName = department?.name || 'Unknown';

//     // Get all relevant users in the hierarchy
//     const usersToNotify = await User.find({
//       $or: [
//         { role: UserRole.COMPANY_ADMIN, companyId: data.companyId },
//         { role: UserRole.DEPARTMENT_ADMIN, departmentId: data.departmentId },
//         { _id: data.assignedTo }
//       ],
//       isActive: true,
//       isDeleted: false
//     });

//     const statusMessage = `📊 *Status Update*\n\n` +
//       `🎫 *${data.type === 'grievance' ? 'Grievance' : 'Appointment'} ID:* ${data.grievanceId || data.appointmentId}\n` +
//       `👤 *Citizen:* ${data.citizenName}\n` +
//       `🏢 *Department:* ${departmentName}\n` +
//       `📊 *Status:* ${oldStatus} → ${newStatus}\n` +
//       `${data.remarks ? `\n📝 *Remarks:* ${data.remarks}` : ''}`;

//     // Prepare email notification data
//     const emailNotificationData = {
//       companyName: company.name,
//       recipientName: '',
//       grievanceId: data.grievanceId || data.appointmentId,
//       citizenName: data.citizenName,
//       citizenPhone: data.citizenPhone,
//       departmentName,
//       remarks: data.remarks
//     };

//     // Notify each user via WhatsApp and Email
//     for (const user of usersToNotify) {
//       // Send WhatsApp
//       if (user.phone && company.whatsappConfig) {
//         try {
//           await sendWhatsAppMessage(company, user.phone, statusMessage);
//         } catch (error) {
//           logger.error(`Failed to notify user ${user.getFullName()} via WhatsApp:`, error);
//         }
//       }

//       // Send Email
//       if (user.email) {
//         try {
//           emailNotificationData.recipientName = user.getFullName();
//           const emailTemplate = generateNotificationEmail(data.type, 'resolved', emailNotificationData);
//           await sendEmail(
//             user.email,
//             `Application Resolved - ${data.grievanceId || data.appointmentId}`,
//             emailTemplate.html,
//             emailTemplate.text
//           );
//         } catch (error) {
//           logger.error(`Failed to notify user ${user.getFullName()} via email:`, error);
//         }
//       }
//     }

//     logger.info(`✅ Notified ${usersToNotify.length} users in hierarchy about status change`);
//   } catch (error: any) {
//     logger.error(`❌ Failed to notify hierarchy:`, error);
//   }
// }


import Company from '../models/Company';
import Department from '../models/Department';
import User from '../models/User';
import { sendEmail, generateNotificationEmail } from './emailService';
import { sendWhatsAppMessage } from './whatsappService';
import { logger } from '../config/logger';
import { UserRole } from '../config/constants';

/**
 * Notification Service
 * Handles email and WhatsApp notifications for grievances and appointments
 */

interface NotificationData {
  type: 'grievance' | 'appointment';
  action: 'created' | 'assigned' | 'resolved';
  grievanceId?: string;
  appointmentId?: string;
  citizenName: string;
  citizenPhone: string;
  citizenWhatsApp?: string;
  departmentId?: any;
  companyId: any;
  description?: string;
  purpose?: string;
  category?: string;
  priority?: string;
  location?: string;
  remarks?: string;
  assignedTo?: any;
  assignedByName?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function isWhatsAppEnabled(company: any): boolean {
  return Boolean(
    company?.whatsappConfig &&
    company.whatsappConfig.phoneNumberId &&
    company.whatsappConfig.accessToken &&
    company.whatsappConfig.businessAccountId
  );
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // India default handling
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11) return digits;

  return null;
}

async function safeSendWhatsApp(
  company: any,
  rawPhone: string | undefined,
  message: string
): Promise<void> {
  if (!rawPhone) return;

  if (!isWhatsAppEnabled(company)) {
    logger.warn('WhatsApp config invalid or missing for company', company?.name);
    return;
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    logger.warn('Invalid WhatsApp phone number format:', rawPhone);
    return;
  }

  try {
    await sendWhatsAppMessage(company, phone, message);
    logger.info('✅ WhatsApp sent', { to: phone });
  } catch (error: any) {
    logger.error('❌ WhatsApp send failed', {
      to: phone,
      error: error?.response?.data || error
    });
  }
}

/* ------------------------------------------------------------------ */
/* Department Admin Lookup                                             */
/* ------------------------------------------------------------------ */

async function getDepartmentAdmin(departmentId: any): Promise<any | null> {
  try {
    return await User.findOne({
      departmentId,
      role: UserRole.DEPARTMENT_ADMIN,
      isActive: true,
      isDeleted: false
    });
  } catch (error) {
    logger.error('Error getting department admin:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Creation Notification                                               */
/* ------------------------------------------------------------------ */

export async function notifyDepartmentAdminOnCreation(
  data: NotificationData
): Promise<void> {
  try {
    const company = await Company.findById(data.companyId);
    if (!company) return;

    const department = await Department.findById(data.departmentId);
    if (!department) return;

    const admin = await getDepartmentAdmin(data.departmentId);
    if (!admin) return;

    const notificationData = {
      companyName: company.name,
      recipientName: admin.getFullName(),
      grievanceId: data.grievanceId || data.appointmentId,
      citizenName: data.citizenName,
      citizenPhone: data.citizenPhone,
      departmentName: department.name,
      category: data.category,
      priority: data.priority,
      description: data.description || data.purpose,
      location: data.location
    };

    // Email
    if (admin.email) {
      try {
        const email = generateNotificationEmail(data.type, 'created', notificationData);
        const result = await sendEmail(admin.email, email.subject, email.html, email.text);
        if (result.success) {
          logger.info(`✅ Email sent to department admin ${admin.getFullName()} (${admin.email})`);
        } else {
          logger.error(`❌ Failed to send email to ${admin.email}:`, result.error);
        }
      } catch (error) {
        logger.error(`❌ Error sending email to ${admin.email}:`, error);
      }
    } else {
      logger.warn(`⚠️ Department admin ${admin.getFullName()} has no email address`);
    }

    // WhatsApp
    const message =
      `📋 *New ${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Received*\n\n` +
      `🎫 *ID:* ${data.grievanceId || data.appointmentId}\n` +
      `👤 *Citizen:* ${data.citizenName}\n` +
      `📞 *Phone:* ${data.citizenPhone}\n` +
      `🏢 *Department:* ${department.name}\n` +
      `${data.category ? `📂 *Category:* ${data.category}\n` : ''}` +
      `${data.priority ? `⚡ *Priority:* ${data.priority}\n` : ''}` +
      `📝 *Details:* ${data.description || data.purpose}`;

    await safeSendWhatsApp(company, admin.phone, message);

  } catch (error) {
    logger.error('❌ notifyDepartmentAdminOnCreation failed:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Assignment Notification                                             */
/* ------------------------------------------------------------------ */

export async function notifyUserOnAssignment(
  data: NotificationData
): Promise<void> {
  try {
    const company = await Company.findById(data.companyId);
    if (!company) return;

    const user = await User.findById(data.assignedTo);
    if (!user) return;

    const department = await Department.findById(data.departmentId);
    const departmentName = department?.name || 'Unknown';

    const emailData = {
      companyName: company.name,
      recipientName: user.getFullName(),
      grievanceId: data.grievanceId || data.appointmentId,
      citizenName: data.citizenName,
      citizenPhone: data.citizenPhone,
      departmentName,
      priority: data.priority,
      description: data.description || data.purpose,
      assignedByName: data.assignedByName || 'System'
    };

    if (user.email) {
      try {
        const email = generateNotificationEmail(data.type, 'assigned', emailData);
        const result = await sendEmail(user.email, email.subject, email.html, email.text);
        if (result.success) {
          logger.info(`✅ Email sent to assigned user ${user.getFullName()} (${user.email})`);
        } else {
          logger.error(`❌ Failed to send email to ${user.email}:`, result.error);
        }
      } catch (error) {
        logger.error(`❌ Error sending email to ${user.email}:`, error);
      }
    } else {
      logger.warn(`⚠️ Assigned user ${user.getFullName()} has no email address`);
    }

    const message =
      `📋 *${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Assigned*\n\n` +
      `🎫 *ID:* ${data.grievanceId || data.appointmentId}\n` +
      `🏢 *Department:* ${departmentName}\n` +
      `👤 *Citizen:* ${data.citizenName}\n` +
      `📝 *Details:* ${data.description || data.purpose}\n` +
      `👨‍💼 *Assigned by:* ${data.assignedByName || 'System'}`;

    await safeSendWhatsApp(company, user.phone, message);

  } catch (error) {
    logger.error('❌ notifyUserOnAssignment failed:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Resolution Notification                                             */
/* ------------------------------------------------------------------ */

export async function notifyCitizenOnResolution(
  data: NotificationData
): Promise<void> {
  try {
    const company = await Company.findById(data.companyId);
    if (!company) return;

    const department = await Department.findById(data.departmentId);
    const departmentName = department?.name || 'Unknown';

    const message =
      `✅ *Your ${data.type === 'grievance' ? 'Grievance' : 'Appointment'} Has Been Resolved*\n\n` +
      `🎫 *Reference ID:* ${data.grievanceId || data.appointmentId}\n` +
      `🏢 *Department:* ${departmentName}\n` +
      `${data.remarks ? `📝 *Remarks:*\n${data.remarks}` : ''}`;

    await safeSendWhatsApp(company, data.citizenWhatsApp || data.citizenPhone, message);

  } catch (error) {
    logger.error('❌ notifyCitizenOnResolution failed:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Hierarchy Notification                                              */
/* ------------------------------------------------------------------ */

export async function notifyHierarchyOnStatusChange(
  data: NotificationData,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  try {
    const company = await Company.findById(data.companyId);
    if (!company) return;

    const department = await Department.findById(data.departmentId);
    const departmentName = department?.name || 'Unknown Department';

    const users = await User.find({
      $or: [
        { role: UserRole.COMPANY_ADMIN, companyId: data.companyId },
        { role: UserRole.DEPARTMENT_ADMIN, departmentId: data.departmentId },
        { _id: data.assignedTo }
      ],
      isActive: true,
      isDeleted: false
    });

    const message =
      `📊 *Status Update*\n\n` +
      `🎫 *ID:* ${data.grievanceId || data.appointmentId}\n` +
      `👤 *Citizen:* ${data.citizenName}\n` +
      `🏢 *Department:* ${departmentName}\n` +
      `📊 *Status:* ${oldStatus} → ${newStatus}` +
      `${data.remarks ? `\n📝 *Remarks:* ${data.remarks}` : ''}`;

    for (const user of users) {
      await safeSendWhatsApp(company, user.phone, message);

      if (user.email) {
        try {
          const email = generateNotificationEmail(data.type, 'resolved', {
            companyName: company.name,
            recipientName: user.getFullName(),
            grievanceId: data.grievanceId || data.appointmentId,
            citizenName: data.citizenName,
            citizenPhone: data.citizenPhone,
            departmentName: departmentName,
            remarks: data.remarks
          });

          const result = await sendEmail(user.email, email.subject, email.html, email.text);
          if (result.success) {
            logger.info(`✅ Email sent to ${user.getFullName()} (${user.email})`);
          } else {
            logger.error(`❌ Failed to send email to ${user.email}:`, result.error);
          }
        } catch (error) {
          logger.error(`❌ Error sending email to ${user.email}:`, error);
        }
      }
    }

  } catch (error) {
    logger.error('❌ notifyHierarchyOnStatusChange failed:', error);
  }
}
