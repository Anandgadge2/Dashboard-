'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userAPI } from '@/lib/api/user';
import { companyAPI, Company } from '@/lib/api/company';
import { departmentAPI, Department } from '@/lib/api/department';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/permissions';
import toast from 'react-hot-toast';
import { validatePhoneNumber, validatePassword, normalizePhoneNumber } from '@/lib/utils/phoneUtils';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ isOpen, onClose, onUserCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'OPERATOR',
    companyId: '',
    departmentId: ''
  });

  // Get available roles based on current user's role
  const getAvailableRoles = (): UserRole[] => {
    if (!user) return [];
    
    const currentRole = user.role as UserRole;
    
    switch (currentRole) {
      case UserRole.SUPER_ADMIN:
        // SuperAdmin can create all roles
        return [
          UserRole.SUPER_ADMIN,
          UserRole.COMPANY_ADMIN,
          UserRole.DEPARTMENT_ADMIN,
          UserRole.OPERATOR,
          UserRole.ANALYTICS_VIEWER
        ];
      case UserRole.COMPANY_ADMIN:
        // CompanyAdmin can create: COMPANY_ADMIN, DEPARTMENT_ADMIN, OPERATOR, ANALYTICS_VIEWER
        return [
          UserRole.COMPANY_ADMIN,
          UserRole.DEPARTMENT_ADMIN,
          UserRole.OPERATOR,
          UserRole.ANALYTICS_VIEWER
        ];
      case UserRole.DEPARTMENT_ADMIN:
        // DepartmentAdmin can create: DEPARTMENT_ADMIN, OPERATOR, ANALYTICS_VIEWER
        return [
          UserRole.DEPARTMENT_ADMIN,
          UserRole.OPERATOR,
          UserRole.ANALYTICS_VIEWER
        ];
      default:
        return [];
    }
  };

  // Define fetchCompanies and fetchDepartments BEFORE useEffect that uses them
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyAPI.getAll();
      if (response.success) {
        // Filter companies based on user's scope
        let filteredCompanies = response.data.companies;
        
        if (user?.role === UserRole.COMPANY_ADMIN) {
          // CompanyAdmin: only show their company
          const userCompanyId = user?.companyId 
            ? (typeof user.companyId === 'object' ? user.companyId._id : user.companyId)
            : '';
          if (userCompanyId) {
            filteredCompanies = response.data.companies.filter((company: Company) => {
              return company._id === userCompanyId;
            });
          }
        }
        // SUPER_ADMIN can see all companies (no filter)
        // DEPARTMENT_ADMIN will only see their company (handled in the select dropdown)
        
        setCompanies(filteredCompanies);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, [user]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentAPI.getAll();
      if (response.success) {
        // Filter departments based on user's scope
        let filteredDepartments = response.data.departments;
        
        if (user?.role === UserRole.COMPANY_ADMIN) {
          // CompanyAdmin: only show departments in their company
          const userCompanyId = user?.companyId 
            ? (typeof user.companyId === 'object' ? user.companyId._id : user.companyId)
            : '';
          if (userCompanyId) {
            filteredDepartments = response.data.departments.filter((dept: Department) => {
              const deptCompanyId = typeof dept.companyId === 'object' ? dept.companyId._id : dept.companyId;
              return deptCompanyId === userCompanyId;
            });
          }
        } else if (user?.role === UserRole.DEPARTMENT_ADMIN) {
          // DepartmentAdmin: only show their department
          const userDepartmentId = user?.departmentId 
            ? (typeof user.departmentId === 'object' ? user.departmentId._id : user.departmentId)
            : '';
          if (userDepartmentId) {
            filteredDepartments = response.data.departments.filter((dept: Department) => {
              return dept._id === userDepartmentId;
            });
          }
        }
        
        setDepartments(filteredDepartments);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchDepartments();
      
      // Auto-select and lock company/department based on user's role
      const userCompanyId = user?.companyId 
        ? (typeof user.companyId === 'object' ? user.companyId._id : user.companyId)
        : '';
      const userDepartmentId = user?.departmentId 
        ? (typeof user.departmentId === 'object' ? user.departmentId._id : user.departmentId)
        : '';
      
      if (user?.role === UserRole.COMPANY_ADMIN && userCompanyId) {
        // CompanyAdmin: auto-set company, disable it
        setFormData(prev => ({ 
          ...prev, 
          companyId: userCompanyId,
          // Set default role to OPERATOR if not set
          role: prev.role || 'OPERATOR'
        }));
      } else if (user?.role === UserRole.DEPARTMENT_ADMIN && userCompanyId && userDepartmentId) {
        // DepartmentAdmin: auto-set company and department, disable both
        setFormData(prev => ({ 
          ...prev, 
          companyId: userCompanyId,
          departmentId: userDepartmentId,
          // Set default role to OPERATOR if not set
          role: prev.role || 'OPERATOR'
        }));
      } else if (user?.role === UserRole.SUPER_ADMIN) {
        // SuperAdmin: reset form, allow all selections
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          role: 'OPERATOR',
          companyId: '',
          departmentId: ''
        });
      }
    }
  }, [isOpen, user, fetchCompanies, fetchDepartments]);

  useEffect(() => {
    // Reset dependent fields when role changes
    if (formData.role === UserRole.COMPANY_ADMIN || formData.role === UserRole.SUPER_ADMIN) {
      setFormData(prev => ({ ...prev, departmentId: '' }));
    }
    // DEPARTMENT_ADMIN and OPERATOR need both companyId and departmentId
    // So we don't clear companyId for DEPARTMENT_ADMIN
  }, [formData.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate phone number if provided
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    // Validate password - must be at least 6 characters
    if (!validatePassword(formData.password)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Role-specific validation
    if (formData.role === UserRole.SUPER_ADMIN) {
      // SuperAdmin doesn't need companyId or departmentId
    } else if (formData.role === UserRole.COMPANY_ADMIN) {
      if (!formData.companyId) {
        toast.error('Please select a company');
        return;
      }
    } else if (formData.role === UserRole.DEPARTMENT_ADMIN || formData.role === UserRole.OPERATOR || formData.role === UserRole.ANALYTICS_VIEWER) {
      if (!formData.companyId || !formData.departmentId) {
        toast.error('Please select a company and department');
        return;
      }
    }
    
    // RBAC validation: Check if user can create the selected role
    const availableRoles = getAvailableRoles();
    if (!availableRoles.includes(formData.role as UserRole)) {
      toast.error('You do not have permission to create users with this role');
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number before sending (add 91 prefix if 10 digits)
      const userData = {
        ...formData,
        phone: formData.phone ? normalizePhoneNumber(formData.phone) : ''
      };
      const response = await userAPI.create(userData);
      if (response.success) {
        toast.success('User created successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          role: 'OPERATOR',
          companyId: '',
          departmentId: ''
        });
        onClose();
        onUserCreated();
      } else {
        toast.error('Failed to create user');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create user';
      console.error('User creation error:', error.response?.data);
      console.error('Full error:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear department if role changes to Company Admin or SuperAdmin
    if (name === 'role' && (value === UserRole.COMPANY_ADMIN || value === UserRole.SUPER_ADMIN)) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        departmentId: ''
      }));
      return;
    }
    
    // Clear department if company changes (for DEPARTMENT_ADMIN, OPERATOR, ANALYTICS_VIEWER)
    if (name === 'companyId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        departmentId: '' // Clear department when company changes
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new user to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 6 characters"
                />
                {formData.password && !validatePassword(formData.password) && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow digits, max 10
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, phone: value }));
                  }}
                  maxLength={10}
                  placeholder="10 digit number (1234567890)"
                />
                {formData.phone && !validatePhoneNumber(formData.phone) && (
                  <p className="text-xs text-red-500 mt-1">Phone number must be exactly 10 digits</p>
                )}
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  {getAvailableRoles().map((role) => (
                    <option key={role} value={role}>
                      {role === UserRole.SUPER_ADMIN && 'Super Admin'}
                      {role === UserRole.COMPANY_ADMIN && 'Company Admin'}
                      {role === UserRole.DEPARTMENT_ADMIN && 'Department Admin'}
                      {role === UserRole.OPERATOR && 'Operator'}
                      {role === UserRole.ANALYTICS_VIEWER && 'Analytics Viewer'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Company field - only for SUPER_ADMIN or COMPANY_ADMIN creating COMPANY_ADMIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.role !== UserRole.SUPER_ADMIN && (
                <div>
                  <Label htmlFor="companyId">
                    Company {formData.role === UserRole.COMPANY_ADMIN || formData.role === UserRole.DEPARTMENT_ADMIN || formData.role === UserRole.OPERATOR || formData.role === UserRole.ANALYTICS_VIEWER ? '*' : ''}
                  </Label>
                  <select
                    id="companyId"
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required={formData.role === UserRole.COMPANY_ADMIN || formData.role === UserRole.DEPARTMENT_ADMIN || formData.role === UserRole.OPERATOR || formData.role === UserRole.ANALYTICS_VIEWER}
                    disabled={user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.DEPARTMENT_ADMIN}
                  >
                    <option value="">Select a company</option>
                    {companies
                      .filter(company => {
                        // Filter companies based on user's scope
                        if (user?.role === UserRole.COMPANY_ADMIN) {
                          const userCompanyId = user?.companyId 
                            ? (typeof user.companyId === 'object' ? user.companyId._id : user.companyId)
                            : '';
                          return company._id === userCompanyId;
                        }
                        // SUPER_ADMIN can see all companies
                        return true;
                      })
                      .map((company) => (
                        <option key={company._id} value={company._id}>
                          {company.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              {/* Department field - required for DEPARTMENT_ADMIN, OPERATOR, ANALYTICS_VIEWER */}
              {(formData.role === UserRole.DEPARTMENT_ADMIN || formData.role === UserRole.OPERATOR || formData.role === UserRole.ANALYTICS_VIEWER) && (
                <div>
                  <Label htmlFor="departmentId">Department *</Label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={!formData.companyId || user?.role === UserRole.DEPARTMENT_ADMIN}
                  >
                    <option value="">
                      {user?.role === UserRole.DEPARTMENT_ADMIN 
                        ? 'Your department (auto-selected)' 
                        : formData.companyId 
                          ? 'Select a department' 
                          : 'Select a company first'}
                    </option>
                    {departments
                      .filter(dept => {
                        if (!formData.companyId) return false;
                        // Handle both string and object companyId
                        const deptCompanyId = typeof dept.companyId === 'object' ? dept.companyId._id : dept.companyId;
                        return deptCompanyId === formData.companyId;
                      })
                      .map((department) => (
                        <option key={department._id} value={department._id}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUserDialog;
