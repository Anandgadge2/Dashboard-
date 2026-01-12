import express, { Request, Response } from 'express';
import Department from '../models/Department';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction, Permission, UserRole } from '../config/constants';

const router = express.Router();

// All routes require authentication and database connection
router.use(authenticate);
router.use(requireDatabaseConnection);

// @route   GET /api/departments
// @desc    Get all departments (scoped by user role)
// @access  Private
router.get('/', requirePermission(Permission.READ_DEPARTMENT), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, companyId } = req.query;
    const user = req.user!;

    const query: any = {};

    // SuperAdmin can see all departments
    if (user.role !== UserRole.SUPER_ADMIN) {
      // Other roles can only see their company's departments
      query.companyId = user.companyId;
    } else if (companyId) {
      // SuperAdmin can filter by company
      query.companyId = companyId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { departmentId: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('companyId', 'name companyId')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Department.countDocuments(query);

    res.json({
      success: true,
      data: {
        departments,
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
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (CompanyAdmin, SuperAdmin)
router.post('/', requirePermission(Permission.CREATE_DEPARTMENT), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { companyId, name, description, contactPerson, contactEmail, contactPhone } = req.body;

    // Validation
    if (!companyId || !name) {
      res.status(400).json({
        success: false,
        message: 'Company ID and name are required'
      });
      return;
    }

    // Non-SuperAdmin users can only create departments for their own company
    if (user.role !== UserRole.SUPER_ADMIN && companyId !== user.companyId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only create departments for your own company'
      });
      return;
    }

    const department = await Department.create({
      companyId,
      name,
      description,
      contactPerson,
      contactEmail,
      contactPhone
    });

    await logUserAction(
      req,
      AuditAction.CREATE,
      'Department',
      department._id.toString(),
      { departmentName: department.name }
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
});

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', requirePermission(Permission.READ_DEPARTMENT), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const department = await Department.findById(req.params.id).populate('companyId', 'name companyId');

    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
      return;
    }

    // Check access
    if (user.role !== UserRole.SUPER_ADMIN && department.companyId._id.toString() !== user.companyId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: { department }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private
router.put('/:id', requirePermission(Permission.UPDATE_DEPARTMENT), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const existingDepartment = await Department.findById(req.params.id);

    if (!existingDepartment) {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
      return;
    }

    // Check access
    if (user.role !== UserRole.SUPER_ADMIN && existingDepartment.companyId.toString() !== user.companyId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'Department',
      department!._id.toString(),
      { updates: req.body }
    );

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { department }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Soft delete department
// @access  Private
router.delete('/:id', requirePermission(Permission.DELETE_DEPARTMENT), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const existingDepartment = await Department.findById(req.params.id);

    if (!existingDepartment) {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
      return;
    }

    // Check access
    if (user.role !== UserRole.SUPER_ADMIN && existingDepartment.companyId.toString() !== user.companyId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user._id
      },
      { new: true }
    );

    await logUserAction(
      req,
      AuditAction.DELETE,
      'Department',
      department!._id.toString()
    );

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
});

export default router;
