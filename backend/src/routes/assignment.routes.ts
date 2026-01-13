import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { Permission, UserRole } from '../config/constants';
import Grievance from '../models/Grievance';
import Appointment from '../models/Appointment';
import User from '../models/User';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction } from '../config/constants';

const router = express.Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(requireDatabaseConnection);

// @route   PUT /api/assignments/grievance/:id/assign
// @desc    Assign grievance to a department admin or operator
// @access  CompanyAdmin, DepartmentAdmin
router.put('/grievance/:id/assign', requirePermission(Permission.UPDATE_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { assignedTo, departmentId } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user ID is required'
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

    // Get the user to assign to
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'User to assign not found'
      });
    }

    // Permission checks
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin can assign within their company
      if (grievance.companyId._id.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign grievances within your company'
        });
      }
      // Ensure assigned user is in the same company
      if (assignedUser.companyId?.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only assign to users within your company'
        });
      }
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      // DepartmentAdmin can only assign within their department
      if (grievance.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign grievances within your department'
        });
      }
      // Ensure assigned user is in the same department
      if (assignedUser.departmentId?.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only assign to users within your department'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to assign grievances'
      });
    }

    // Track old values for timeline
    const oldAssignedTo = grievance.assignedTo;
    const oldDepartmentId = grievance.departmentId?._id;

    // Update grievance
    grievance.assignedTo = assignedUser._id;
    grievance.assignedAt = new Date();
    
    // Auto-update department based on assigned user's department
    // If the assigned user belongs to a different department than the current one
    if (assignedUser.departmentId && (!oldDepartmentId || oldDepartmentId.toString() !== assignedUser.departmentId.toString())) {
      grievance.departmentId = assignedUser.departmentId as any;
      
      // Add department transfer event
      grievance.timeline.push({
        action: 'DEPARTMENT_TRANSFER',
        details: {
          fromDepartmentId: oldDepartmentId,
          toDepartmentId: assignedUser.departmentId,
          reason: 'Auto-updated during reassignment'
        },
        performedBy: currentUser._id,
        timestamp: new Date()
      });
    } else if (departmentId && (!oldDepartmentId || oldDepartmentId.toString() !== departmentId)) {
        // Manual department update if provided
        grievance.departmentId = departmentId;
        grievance.timeline.push({
          action: 'DEPARTMENT_TRANSFER',
          details: {
            fromDepartmentId: oldDepartmentId,
            toDepartmentId: departmentId,
            reason: 'Manual transfer'
          },
          performedBy: currentUser._id,
          timestamp: new Date()
        });
    }
    
    // Add assignment event
    grievance.timeline.push({
      action: 'ASSIGNED',
      details: {
        fromUserId: oldAssignedTo,
        toUserId: assignedUser._id,
        toUserName: assignedUser.getFullName()
      },
      performedBy: currentUser._id,
      timestamp: new Date()
    });
    
    await grievance.save();

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Grievance',
      grievance._id.toString(),
      {
        action: 'assign',
        assignedTo: assignedUser.getFullName(),
        grievanceId: grievance.grievanceId
      }
    );

    res.json({
      success: true,
      message: 'Grievance assigned successfully',
      data: { grievance }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign grievance',
      error: error.message
    });
  }
});

// @route   PUT /api/assignments/appointment/:id/assign
// @desc    Assign appointment to a department admin or operator
// @access  CompanyAdmin, DepartmentAdmin
router.put('/appointment/:id/assign', requirePermission(Permission.UPDATE_APPOINTMENT), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { assignedTo, departmentId } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user ID is required'
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

    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'User to assign not found'
      });
    }

    // Permission checks (same as grievance)
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (appointment.companyId._id.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign appointments within your company'
        });
      }
      if (assignedUser.companyId?.toString() !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only assign to users within your company'
        });
      }
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      if (appointment.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign appointments within your department'
        });
      }
      if (assignedUser.departmentId?.toString() !== currentUser.departmentId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only assign to users within your department'
        });
      }
    }

    // Track old values
    const oldAssignedTo = appointment.assignedTo;
    const oldDepartmentId = appointment.departmentId?._id;

    appointment.assignedTo = assignedUser._id;
    
    // Auto-update department based on assigned user's department
    if (assignedUser.departmentId && (!oldDepartmentId || oldDepartmentId.toString() !== assignedUser.departmentId.toString())) {
      appointment.departmentId = assignedUser.departmentId as any;
      
      // Add department transfer event
      appointment.timeline.push({
        action: 'DEPARTMENT_TRANSFER',
        details: {
          fromDepartmentId: oldDepartmentId,
          toDepartmentId: assignedUser.departmentId,
          reason: 'Auto-updated during reassignment'
        },
        performedBy: currentUser._id,
        timestamp: new Date()
      });
    } else if (departmentId && (!oldDepartmentId || oldDepartmentId.toString() !== departmentId)) {
        // Manual department update if provided
        appointment.departmentId = departmentId;
        appointment.timeline.push({
          action: 'DEPARTMENT_TRANSFER',
          details: {
            fromDepartmentId: oldDepartmentId,
            toDepartmentId: departmentId,
            reason: 'Manual transfer'
          },
          performedBy: currentUser._id,
          timestamp: new Date()
        });
    }
    
    // Add assignment event
    appointment.timeline.push({
      action: 'ASSIGNED',
      details: {
        fromUserId: oldAssignedTo,
        toUserId: assignedUser._id,
        toUserName: assignedUser.getFullName()
      },
      performedBy: currentUser._id,
      timestamp: new Date()
    });
    
    await appointment.save();

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Appointment',
      appointment._id.toString(),
      {
        action: 'assign',
        assignedTo: assignedUser.getFullName(),
        appointmentId: appointment.appointmentId
      }
    );

    res.json({
      success: true,
      message: 'Appointment assigned successfully',
      data: { appointment }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign appointment',
      error: error.message
    });
  }
});

// @route   GET /api/assignments/users/available
// @desc    Get list of users available for assignment
// @access  CompanyAdmin, DepartmentAdmin
router.get('/users/available', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const query: any = { isActive: true, isDeleted: false };

    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // Get all admins and operators in the company
      query.companyId = currentUser.companyId;
      query.role = { $in: [UserRole.DEPARTMENT_ADMIN, UserRole.OPERATOR] };
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      // Get all operators in the department
      query.departmentId = currentUser.departmentId;
      query.role = UserRole.OPERATOR;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const users = await User.find(query)
      .select('firstName lastName email role departmentId')
      .populate('departmentId', 'name')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available users',
      error: error.message
    });
  }
});

export default router;
