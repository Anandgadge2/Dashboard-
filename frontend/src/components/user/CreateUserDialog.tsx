'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userAPI } from '@/lib/api/user';
import { companyAPI, Company } from '@/lib/api/company';
import { departmentAPI, Department } from '@/lib/api/department';
import toast from 'react-hot-toast';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ isOpen, onClose, onUserCreated }) => {
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

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset dependent fields when role changes
    if (formData.role === 'COMPANY_ADMIN' || formData.role === 'SUPER_ADMIN') {
      setFormData(prev => ({ ...prev, departmentId: '' }));
    }
    // DEPARTMENT_ADMIN and OPERATOR need both companyId and departmentId
    // So we don't clear companyId for DEPARTMENT_ADMIN
  }, [formData.role]);

  const fetchCompanies = async () => {
    try {
      const response = await companyAPI.getAll();
      if (response.success) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAll();
      if (response.success) {
        setDepartments(response.data.departments);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Role-specific validation
    if (formData.role === 'SUPER_ADMIN') {
      // SuperAdmin doesn't need companyId or departmentId
    } else if (formData.role === 'COMPANY_ADMIN') {
      if (!formData.companyId) {
        toast.error('Please select a company');
        return;
      }
    } else if (formData.role === 'DEPARTMENT_ADMIN' || formData.role === 'OPERATOR' || formData.role === 'ANALYTICS_VIEWER') {
      if (!formData.companyId || !formData.departmentId) {
        toast.error('Please select a company and department');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await userAPI.create(formData);
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
    if (name === 'role' && (value === 'COMPANY_ADMIN' || value === 'SUPER_ADMIN')) {
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
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Secure password"
                />
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
                  onChange={handleChange}
                  placeholder="+1234567890"
                />
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
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                  <option value="DEPARTMENT_ADMIN">Department Admin</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="ANALYTICS_VIEWER">Analytics Viewer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.role !== 'SUPER_ADMIN' && (
                <div>
                  <Label htmlFor="companyId">Company {formData.role === 'COMPANY_ADMIN' || formData.role === 'DEPARTMENT_ADMIN' || formData.role === 'OPERATOR' || formData.role === 'ANALYTICS_VIEWER' ? '*' : ''}</Label>
                  <select
                    id="companyId"
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required={formData.role === 'COMPANY_ADMIN' || formData.role === 'DEPARTMENT_ADMIN' || formData.role === 'OPERATOR' || formData.role === 'ANALYTICS_VIEWER'}
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(formData.role === 'DEPARTMENT_ADMIN' || formData.role === 'OPERATOR' || formData.role === 'ANALYTICS_VIEWER') && (
                <div>
                  <Label htmlFor="departmentId">Department *</Label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={!formData.companyId}
                  >
                    <option value="">{formData.companyId ? 'Select a department' : 'Select a company first'}</option>
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
