  import express, { Request, Response } from 'express';
import Grievance from '../models/Grievance';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction, Permission, UserRole, GrievanceStatus } from '../config/constants';

const router = express.Router();

// All routes require authentication and database connection
router.use(authenticate);
router.use(requireDatabaseConnection);

// @route   GET /api/grievances
// @desc    Get all grievances (scoped by role)
// @access  Private
router.get('/', requirePermission(Permission.READ_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, departmentId, assignedTo, priority } = req.query;
    const currentUser = req.user!;

    const query: any = {};

    // Scope based on user role
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // SuperAdmin can see all grievances
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin can see all grievances in their company
      query.companyId = currentUser.companyId;
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      // DepartmentAdmin can see grievances in their department
      query.departmentId = currentUser.departmentId;
    } else if (currentUser.role === UserRole.OPERATOR) {
      // Operator can only see assigned grievances
      query.assignedTo = currentUser._id;
    }

    // Apply filters
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

    const grievances = await Grievance.find(query)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Grievance.countDocuments(query);

    res.json({
      success: true,
      data: {
        grievances,
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
      message: 'Failed to fetch grievances',
      error: error.message
    });
  }
});

// @route   POST /api/grievances
// @desc    Create new grievance (usually from WhatsApp webhook)
// @access  Private
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      departmentId,
      citizenName,
      citizenPhone,
      citizenWhatsApp,
      description,
      category,
      priority,
      location,
      media
    } = req.body;

    // Validation
    if (!companyId || !citizenName || !citizenPhone || !description) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
      return;
    }

    const grievance = await Grievance.create({
      companyId,
      departmentId,
      citizenName,
      citizenPhone,
      citizenWhatsApp: citizenWhatsApp || citizenPhone,
      description,
      category,
      priority: priority || 'MEDIUM',
      location,
      media: media || [],
      status: GrievanceStatus.PENDING
    });

    res.status(201).json({
      success: true,
      message: 'Grievance registered successfully',
      data: { grievance }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create grievance',
      error: error.message
    });
  }
});

// @route   GET /api/grievances/:id
// @desc    Get grievance by ID
// @access  Private
router.get('/:id', requirePermission(Permission.READ_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const grievance = await Grievance.findById(req.params.id)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .populate('assignedTo', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName');

    if (!grievance) {
      res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
      return;
    }

    // Check access
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && grievance.companyId._id.toString() !== currentUser.companyId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.DEPARTMENT_ADMIN && grievance.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.OPERATOR && grievance.assignedTo?._id.toString() !== currentUser._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { grievance }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grievance',
      error: error.message
    });
  }
});

// @route   PUT /api/grievances/:id/status
// @desc    Update grievance status
// @access  Private
router.put('/:id/status', requirePermission(Permission.UPDATE_GRIEVANCE), async (req: Request, res: Response) => {
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

    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
      return;
    }

    // Update status
    grievance.status = status;
    grievance.statusHistory.push({
      status,
      changedBy: currentUser._id,
      changedAt: new Date(),
      remarks
    });

    // Update timestamps based on status
    if (status === GrievanceStatus.RESOLVED) {
      grievance.resolvedAt = new Date();
    } else if (status === GrievanceStatus.CLOSED) {
      grievance.closedAt = new Date();
    }

    await grievance.save();

    await logUserAction(
      req,
      AuditAction.STATUS_CHANGE,
      'Grievance',
      grievance._id.toString(),
      { oldStatus: grievance.status, newStatus: status, remarks }
    );

    res.json({
      success: true,
      message: 'Grievance status updated successfully',
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

// @route   PUT /api/grievances/:id/assign
// @desc    Assign grievance to user
// @access  Private
router.put('/:id/assign', requirePermission(Permission.ASSIGN_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const { assignedTo, departmentId } = req.body;

    if (!assignedTo) {
      res.status(400).json({
        success: false,
        message: 'Assigned user ID is required'
      });
      return;
    }

    const updateData: any = {
      assignedTo,
      assignedAt: new Date(),
      status: GrievanceStatus.ASSIGNED
    };

    // Update department if provided (department transfer)
    if (departmentId) {
      updateData.departmentId = departmentId;
    }

    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!grievance) {
      res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
      return;
    }

    // Add to status history
    const remarks = departmentId 
      ? `Assigned to user and transferred to new department`
      : `Assigned to user`;
    
    grievance.statusHistory.push({
      status: GrievanceStatus.ASSIGNED,
      changedBy: req.user!._id,
      changedAt: new Date(),
      remarks
    });

    await grievance.save();

    await logUserAction(
      req,
      AuditAction.ASSIGN,
      'Grievance',
      grievance._id.toString(),
      { assignedTo, departmentId }
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

// @route   PUT /api/grievances/:id
// @desc    Update grievance details
// @access  Private
router.put('/:id', requirePermission(Permission.UPDATE_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!grievance) {
      res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
      return;
    }

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Grievance',
      grievance._id.toString(),
      { updates: req.body }
    );

    res.json({
      success: true,
      message: 'Grievance updated successfully',
      data: { grievance }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update grievance',
      error: error.message
    });
  }
});

// @route   DELETE /api/grievances/:id
// @desc    Soft delete grievance
// @access  Private
router.delete('/:id', requirePermission(Permission.DELETE_GRIEVANCE), async (req: Request, res: Response) => {
  try {
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user!._id
      },
      { new: true }
    );

    if (!grievance) {
      res.status(404).json({
        success: false,
        message: 'Grievance not found'
      });
      return;
    }

    await logUserAction(
      req,
      AuditAction.DELETE,
      'Grievance',
      grievance._id.toString()
    );

    res.json({
      success: true,
      message: 'Grievance deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete grievance',
      error: error.message
    });
  }
});

export default router;
