import express, { Request, Response } from 'express';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireDatabaseConnection } from '../middleware/dbConnection';
import { logUserAction } from '../utils/auditLogger';
import { AuditAction, Permission, UserRole } from '../config/constants';

const router = express.Router();

// All routes require database connection and authentication
router.use(requireDatabaseConnection);
router.use(authenticate);

// @route   GET /api/users
// @desc    Get all users (scoped by role)
// @access  Private
router.get('/', requirePermission(Permission.READ_USER), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role, companyId, departmentId } = req.query;
    const currentUser = req.user!;

    const query: any = {};

    // Scope based on user role
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // SuperAdmin can see all users, optionally filter by company
      if (companyId) query.companyId = companyId;
      if (departmentId) query.departmentId = departmentId;
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin can only see users in their company
      query.companyId = currentUser.companyId;
      if (departmentId) query.departmentId = departmentId;
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      // DepartmentAdmin can only see users in their department
      query.departmentId = currentUser.departmentId;
    } else if (currentUser.role === UserRole.OPERATOR) {
      // Operators can only see users in their department
      if (currentUser.departmentId) {
        query.departmentId = currentUser.departmentId;
      } else {
        // If operator has no department, return empty
        res.json({
          success: true,
          data: {
            users: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 }
          }
        });
        return;
      }
    } else {
      // Other roles cannot list users
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .select('-password')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private
router.post('/', requirePermission(Permission.CREATE_USER), async (req: Request, res: Response) => {
  try {
    console.log('📝 User creation request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const currentUser = req.user!;
    console.log('Current user:', { id: currentUser._id, role: currentUser.role, companyId: currentUser.companyId });
    
    const { firstName, lastName, email, password, phone, role, departmentId } = req.body;
    let companyId = req.body.companyId;

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Validate and normalize phone number if provided
    let normalizedPhone = phone;
    if (phone) {
      const { validatePhoneNumber, normalizePhoneNumber } = await import('../utils/phoneUtils');
      if (!validatePhoneNumber(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits'
        });
      }
      normalizedPhone = normalizePhoneNumber(phone);
    }
    console.log('✅ Basic validation passed');

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User with email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    console.log('✅ Email is unique');

    // Scope validation and role-specific requirements
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      console.log('Checking COMPANY_ADMIN scope:', { requestedCompanyId: companyId, userCompanyId: currentUser.companyId?.toString() });
      // CompanyAdmin can only create users in their company
      if (companyId !== currentUser.companyId?.toString()) {
        console.log('❌ Scope validation failed for COMPANY_ADMIN');
        return res.status(403).json({
          success: false,
          message: 'You can only create users for your own company'
        });
      }
      // CompanyAdmin cannot create SuperAdmin
      if (role === UserRole.SUPER_ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'You cannot create SuperAdmin users'
        });
      }
    } else if (currentUser.role === UserRole.DEPARTMENT_ADMIN) {
      console.log('Checking DEPARTMENT_ADMIN scope:', { requestedDepartmentId: departmentId, userDepartmentId: currentUser.departmentId?.toString() });
      // DepartmentAdmin can only create users in their department
      if (departmentId !== currentUser.departmentId?.toString()) {
        console.log('❌ Scope validation failed for DEPARTMENT_ADMIN');
        return res.status(403).json({
          success: false,
          message: 'You can only create users for your own department'
        });
      }
      // DepartmentAdmin should use their companyId
      if (companyId && companyId !== currentUser.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create users for your own company'
        });
      }
      // Auto-set companyId from department if not provided
      if (!companyId && currentUser.companyId) {
        companyId = currentUser.companyId.toString();
      }
      // DepartmentAdmin cannot create SuperAdmin or CompanyAdmin
      if (role === UserRole.SUPER_ADMIN || role === UserRole.COMPANY_ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'You cannot create users with this role'
        });
      }
    }
    
    // Role-specific field requirements
    if (role === UserRole.COMPANY_ADMIN && !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required for Company Admin'
      });
    }
    
    if ((role === UserRole.DEPARTMENT_ADMIN || role === UserRole.OPERATOR || role === UserRole.ANALYTICS_VIEWER) && (!companyId || !departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Both Company ID and Department ID are required for this role'
      });
    }
    
    console.log('✅ Scope validation passed');

    // For DEPARTMENT_ADMIN, OPERATOR, ANALYTICS_VIEWER: get companyId from department if not provided
    let finalCompanyId = companyId;
    if (departmentId && !finalCompanyId) {
      const Department = (await import('../models/Department')).default;
      const department = await Department.findById(departmentId);
      if (department) {
        finalCompanyId = department.companyId.toString();
        console.log('✅ Auto-set companyId from department:', finalCompanyId);
      }
    }
    
    console.log('Creating user with data:', { firstName, lastName, email, role, companyId: finalCompanyId, departmentId });
    
    // Database connection is already checked by middleware

    // Create user in database
    let user;
    try {
      user = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        password,
        phone: normalizedPhone || undefined,
        role,
        companyId: finalCompanyId || undefined,
        departmentId: departmentId || undefined,
        isActive: true,
        isDeleted: false
      });
      console.log('✅ User created successfully in database:', user.userId);
      console.log('✅ User ID:', user._id);
      console.log('✅ User companyId:', user.companyId);
      console.log('✅ User departmentId:', user.departmentId);
    } catch (dbError: any) {
      console.error('❌ Database save error:', dbError);
      console.error('Error name:', dbError.name);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      
      // Handle duplicate key error
      if (dbError.code === 11000) {
        const field = Object.keys(dbError.keyPattern || {})[0];
        return res.status(400).json({
          success: false,
          message: `User with this ${field} already exists`,
          error: dbError.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save user to database',
        error: dbError.message
      });
    }

    // Verify user was saved
    const savedUser = await User.findById(user._id);
    if (!savedUser) {
      console.error('❌ User was not saved to database');
      return res.status(500).json({
        success: false,
        message: 'User creation failed - user not found in database'
      });
    }
    console.log('✅ Verified user exists in database:', savedUser.userId);

    // Audit logging - don't let this fail the request
    try {
      await logUserAction(
        req,
        AuditAction.CREATE,
        'User',
        user._id.toString(),
        { userName: user.getFullName(), email: user.email }
      );
      console.log('✅ Audit log created');
    } catch (auditError: any) {
      console.error('⚠️  Audit logging failed (non-critical):', auditError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error: any) {
    console.error('❌ User creation error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', requirePermission(Permission.READ_USER), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const user = await User.findById(req.params.id)
      .populate('companyId', 'name companyId')
      .populate('departmentId', 'name departmentId')
      .select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check access
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && user.companyId?._id.toString() !== currentUser.companyId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.DEPARTMENT_ADMIN && user.departmentId?._id.toString() !== currentUser.departmentId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', requirePermission(Permission.UPDATE_USER), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const existingUser = await User.findById(req.params.id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Prevent self-deactivation
    if (existingUser._id.toString() === currentUser._id.toString() && req.body.isActive === false) {
      res.status(403).json({
        success: false,
        message: 'You cannot deactivate yourself'
      });
      return;
    }

    // Check access
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && existingUser.companyId?.toString() !== currentUser.companyId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.DEPARTMENT_ADMIN && existingUser.departmentId?.toString() !== currentUser.departmentId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
    }

    // Don't allow password update through this route
    delete req.body.password;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'User',
      user!._id.toString(),
      { updates: req.body }
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Soft delete user
// @access  Private
router.delete('/:id', requirePermission(Permission.DELETE_USER), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const existingUser = await User.findById(req.params.id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Prevent self-deletion
    if (existingUser._id.toString() === currentUser._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You cannot delete yourself'
      });
      return;
    }

    // Check access
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && existingUser.companyId?.toString() !== currentUser.companyId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
      if (currentUser.role === UserRole.DEPARTMENT_ADMIN && existingUser.departmentId?.toString() !== currentUser.departmentId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUser._id,
        isActive: false
      },
      { new: true }
    );

    await logUserAction(
      req,
      AuditAction.DELETE,
      'User',
      user!._id.toString()
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate/deactivate user
// @access  Private
router.put('/:id/activate', requirePermission(Permission.UPDATE_USER), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    await logUserAction(
      req,
      AuditAction.UPDATE,
      'User',
      user._id.toString(),
      { action: isActive ? 'activated' : 'deactivated' }
    );

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
});

export default router;
