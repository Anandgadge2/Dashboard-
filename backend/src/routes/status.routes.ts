import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { Permission, UserRole, GrievanceStatus, AppointmentStatus } from '../config/constants';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import Company from '../models/Company';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction } from '../config/constants';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { getTranslation } from '../services/chatbotEngine';

const router = express.Router();

router.use(authenticate);
router.use(requireDatabaseConnection);

// Status update messages for WhatsApp
const getStatusMessage = (type: 'grievance' | 'appointment', id: string, status: string, remarks?: string) => {
  const emoji = {
    PENDING: '⏳',
    IN_PROGRESS: '🔄',
    RESOLVED: '✅',
    CLOSED: '🔒',
    CANCELLED: '❌',
    CONFIRMED: '✅',
    COMPLETED: '🎉',
    NO_SHOW: '❌'
  }[status] || '📋';

  const typeName = type === 'grievance' ? 'Grievance' : 'Appointment';
  
  let message = `${emoji} *${typeName} Status Update*\n\n`;
  message += `ID: *${id}*\n`;
  message += `Status: *${status.replace('_', ' ')}*\n`;
  
  if (remarks) {
    message += `\nRemarks: ${remarks}\n`;
  }
  
  message += `\nThank you for your patience. We are committed to serving you better.`;
  
  return message;
};

// @route   PUT /api/status/grievance/:id
// @desc    Update grievance status and notify citizen via WhatsApp
// @access  DepartmentAdmin, Operator, CompanyAdmin
router.put('/grievance/:id', requirePermission(Permission.UPDATE_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = Object.values(GrievanceStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const grievance = await Grievance.findById(req.params.id)
      .populate('companyId')
      .populate('departmentId');

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
    }

    // Permission checks
    if (currentUser.role === UserRole.DEPARTMENT_ADMIN || currentUser.role === UserRole.OPERATOR) {
      if (grievance.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update grievances in your department'
        });
      }
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (grievance.companyId._id.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update grievances in your company'
        });
      }
    }

    const oldStatus = grievance.status;
    grievance.status = status;

    // Add to status history
    if (!grievance.statusHistory) {
      grievance.statusHistory = [];
    }
    grievance.statusHistory.push({
      status,
      remarks,
      changedBy: currentUser._id,
      changedAt: new Date()
    });

    // Update timestamps based on status
    if (status === GrievanceStatus.RESOLVED && !grievance.resolvedAt) {
      grievance.resolvedAt = new Date();
    } else if (status === GrievanceStatus.CLOSED && !grievance.closedAt) {
      grievance.closedAt = new Date();
    }

    // Add to timeline
    if (!grievance.timeline) {
      grievance.timeline = [];
    }
    grievance.timeline.push({
      action: 'STATUS_UPDATED',
      details: {
        fromStatus: oldStatus,
        toStatus: status,
        remarks
      },
      performedBy: currentUser._id,
      timestamp: new Date()
    });

    await grievance.save();

    // Send WhatsApp notification ONLY if status is RESOLVED
    if (status === GrievanceStatus.RESOLVED) {
      try {
        const company = await Company.findById(grievance.companyId);
        if (company && grievance.citizenWhatsApp) {
          const notificationMessage = getTranslation('grievanceResolvedNotify', grievance.language)
            .replace('{id}', grievance.grievanceId)
            .replace('{remarks}', remarks || getTranslation('label_no_remarks', grievance.language));

          await sendWhatsAppMessage(company, grievance.citizenWhatsApp, notificationMessage);
          console.log('✅ Localized Resolution notification sent to citizen:', grievance.citizenWhatsApp);
        }
      } catch (notifError: any) {
        console.error('⚠️  Failed to send WhatsApp notification:', notifError.message);
      }
    }

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Grievance',
      grievance._id.toString(),
      {
        action: 'status_change',
        oldStatus,
        newStatus: status,
        remarks,
        grievanceId: grievance.grievanceId
      }
    );

    res.json({
      success: true,
      message: 'Grievance status updated successfully. Citizen has been notified via WhatsApp.',
      data: { grievance }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update grievance status',
      error: error.message
    });
  }
});

// @route   PUT /api/status/appointment/:id
// @desc    Update appointment status and notify citizen via WhatsApp
// @access  DepartmentAdmin, Operator, CompanyAdmin
router.put('/appointment/:id', requirePermission(Permission.UPDATE_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = Object.values(AppointmentStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('companyId')
      .populate('departmentId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Permission checks
    if (currentUser.role === UserRole.DEPARTMENT_ADMIN || currentUser.role === UserRole.OPERATOR) {
      if (appointment.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update appointments in your department'
        });
      }
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (appointment.companyId._id.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update appointments in your company'
        });
      }
    }

    const oldStatus = appointment.status;
    appointment.status = status;

    // Add to status history
    if (!appointment.statusHistory) {
      appointment.statusHistory = [];
    }
    appointment.statusHistory.push({
      status,
      remarks,
      changedBy: currentUser._id,
      changedAt: new Date()
    });

    // Update timestamps
    if (status === AppointmentStatus.COMPLETED && !appointment.completedAt) {
      appointment.completedAt = new Date();
    } else if (status === AppointmentStatus.CANCELLED && !appointment.cancelledAt) {
      appointment.cancelledAt = new Date();
    }

    // Add to timeline
    if (!appointment.timeline) {
      appointment.timeline = [];
    }
    appointment.timeline.push({
      action: 'STATUS_UPDATED',
      details: {
        fromStatus: oldStatus,
        toStatus: status,
        remarks
      },
      performedBy: currentUser._id,
      timestamp: new Date()
    });

    await appointment.save();

    // Send WhatsApp notification
    try {
      const company = await Company.findById(appointment.companyId);
      if (company && company.whatsappConfig?.phoneNumberId && appointment.citizenWhatsApp) {
        const message = getStatusMessage('appointment', appointment.appointmentId, status, remarks);
        await sendWhatsAppMessage(company, appointment.citizenWhatsApp, message);
        console.log('✅ WhatsApp notification sent to citizen:', appointment.citizenWhatsApp);
      }
    } catch (notifError: any) {
      console.error('⚠️  Failed to send WhatsApp notification:', notifError.message);
    }

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Appointment',
      appointment._id.toString(),
      {
        action: 'status_change',
        oldStatus,
        newStatus: status,
        remarks,
        appointmentId: appointment.appointmentId
      }
    );

    res.json({
      success: true,
      message: 'Appointment status updated successfully. Citizen has been notified via WhatsApp.',
      data: { appointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status',
      error: error.message
    });
  }
});

export default router;
