import express, { Request, Response } from 'express';
import User from '../models/User';
import Appointment from '../models/Appointment';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction, Permission, UserRole, AppointmentStatus } from '../config/constants';

const router = express.Router();

// All routes require authentication and database connection
router.use(authenticate);
router.use(requireDatabaseConnection);

// @route   GET /api/appointments
// @desc    Get all appointments (scoped by role)
// @access  Private
router.get('/', requirePermission(Permission.READ_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, departmentId, assignedTo, date } = req.query;
    const currentUser = req.user!;

    const query: any = {};

    // Scope based on user role
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // SuperAdmin can see all appointments
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin can see all appointments in their company
      query.companyId = currentUser.companyId;
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      // DepartmentAdmin can see appointments in their department
      query.departmentId = currentUser.departmentId;
    } else if (currentUser.role === UserRole.OPERATOR) {
      // Operator can only see assigned appointments
      query.assignedTo = currentUser._id;
    }

    // Apply filters
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment (usually from WhatsApp webhook)
// @access  Public (for WhatsApp integration)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      departmentId,
      citizenName,
      citizenPhone,
      citizenWhatsApp,
      citizenEmail,
      purpose,
      appointmentDate,
      appointmentTime,
      duration,
      location
    } = req.body;

    // Validation
    if (!companyId || !citizenName || !citizenPhone || !purpose || !appointmentDate || !appointmentTime) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
      return;
    }

    const appointment = await Appointment.create({
      companyId,
      departmentId,
      citizenName,
      citizenPhone,
      citizenWhatsApp: citizenWhatsApp || citizenPhone,
      citizenEmail,
      purpose,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      duration: duration || 30,
      location,
      status: AppointmentStatus.PENDING
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message
    });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', requirePermission(Permission.READ_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const appointment = await Appointment.findById(req.params.id)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('timeline.performedBy', 'firstName lastName role');

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    // Check access
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && appointment.companyId._id.toString() !== currentUser.companyId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.DEPARTMENT_ADMIN && appointment.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.OPERATOR && appointment.assignedTo?._id.toString() !== currentUser._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { appointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: error.message
    });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private
router.put('/:id/status', requirePermission(Permission.UPDATE_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { status, remarks } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    const oldStatus = appointment.status;
    
    // Update status
    appointment.status = status;
    appointment.statusHistory.push({
      status,
      changedBy: currentUser._id,
      changedAt: new Date(),
      remarks
    });

    // Update timestamps based on status
    if (status === AppointmentStatus.COMPLETED) {
      appointment.completedAt = new Date();
    } else if (status === AppointmentStatus.CANCELLED) {
      appointment.cancelledAt = new Date();
      if (remarks) {
        appointment.cancellationReason = remarks;
      }
    }

    // Add to timeline
    if (!appointment.timeline) appointment.timeline = [];
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
    
    // RE-POPULATE AFTER SAVE to get the latest data including timeline
    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName');

    await logUserAction(
      req,
      AuditAction.STATUS_CHANGE,
      'Appointment',
      appointment._id.toString(),
      { oldStatus: appointment.status, newStatus: status, remarks }
    );

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      data: { appointment: updatedAppointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status',
      error: error.message
    });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment details
// @access  Private
router.put('/:id', requirePermission(Permission.UPDATE_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Appointment',
      appointment._id.toString(),
      { updates: req.body }
    );

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: { appointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Soft delete appointment
// @access  Private
router.delete('/:id', requirePermission(Permission.DELETE_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user!._id
      },
      { new: true }
    );

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
      return;
    }

    await logUserAction(
      req,
      AuditAction.DELETE,
      'Appointment',
      appointment._id.toString()
    );

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment',
      error: error.message
    });
  }
});

export default router;
