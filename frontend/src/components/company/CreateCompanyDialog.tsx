'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { companyAPI, CreateCompanyData, Company } from '@/lib/api/company';
import toast from 'react-hot-toast';

// Available modules
const AVAILABLE_MODULES = [
  { id: 'GRIEVANCE', name: 'Grievance Management', description: 'Handle citizen complaints and grievances' },
  { id: 'APPOINTMENT', name: 'Appointment Booking', description: 'Schedule and manage appointments' },
  { id: 'STATUS_TRACKING', name: 'Status Tracking', description: 'Track application and request status' },
  { id: 'LEAD_CAPTURE', name: 'Lead Capture', description: 'Capture and manage leads' },
  { id: 'SURVEY', name: 'Survey & Feedback', description: 'Conduct surveys and collect feedback' },
  { id: 'FEEDBACK', name: 'Feedback System', description: 'Collect and manage feedback' },
  { id: 'DOCUMENT_UPLOAD', name: 'Document Upload', description: 'Allow document uploads' },
  { id: 'GEO_LOCATION', name: 'Geo Location', description: 'Location-based services' },
  { id: 'MULTI_LANGUAGE', name: 'Multi Language', description: 'Support multiple languages' }
];

interface CreateCompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: () => void;
  editingCompany?: Company | null;
}

const CreateCompanyDialog: React.FC<CreateCompanyDialogProps> = ({ isOpen, onClose, onCompanyCreated, editingCompany }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCompanyData>({
    name: '',
    companyType: 'GOVERNMENT',
    contactEmail: '',
    contactPhone: '',
    address: '',
    enabledModules: [],
    theme: {
      primaryColor: '#0f4c81',
      secondaryColor: '#1a73e8'
    },
    admin: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: ''
    }
  });
  const [showAdminForm, setShowAdminForm] = useState(false);

  useEffect(() => {
    if (editingCompany) {
      setFormData({
        name: editingCompany.name,
        companyType: editingCompany.companyType,
        contactEmail: editingCompany.contactEmail,
        contactPhone: editingCompany.contactPhone,
        address: editingCompany.address || '',
        enabledModules: editingCompany.enabledModules || [],
        theme: editingCompany.theme || {
          primaryColor: '#0f4c81',
          secondaryColor: '#1a73e8'
        },
        admin: {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: ''
        }
      });
      setShowAdminForm(false);
    } else {
      // Reset form for creating new company
      setFormData({
        name: '',
        companyType: 'GOVERNMENT',
        contactEmail: '',
        contactPhone: '',
        address: '',
        enabledModules: [],
        theme: {
          primaryColor: '#0f4c81',
          secondaryColor: '#1a73e8'
        },
        admin: {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: ''
        }
      });
      setShowAdminForm(false);
    }
  }, [editingCompany, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactEmail || !formData.contactPhone) {
      toast.error('Please fill in all required company fields');
      return;
    }

    if (showAdminForm && (!formData.admin?.firstName || !formData.admin?.lastName || !formData.admin?.email || !formData.admin?.password)) {
      toast.error('Please fill in all admin fields');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (editingCompany) {
        // Update existing company
        response = await companyAPI.update(editingCompany._id, formData);
        if (response.success) {
          toast.success('Company updated successfully!');
        }
      } else {
        // Create new company
        response = await companyAPI.create(formData);
        if (response.success) {
          toast.success('Company created successfully!');
        }
      }
      
      if (response.success) {
        setFormData({
          name: '',
          companyType: 'GOVERNMENT',
          contactEmail: '',
          contactPhone: '',
          address: '',
          enabledModules: [],
          theme: {
            primaryColor: '#0f4c81',
            secondaryColor: '#1a73e8'
          },
          admin: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: ''
          }
        });
        setShowAdminForm(false);
        onClose();
        onCompanyCreated();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save company';
      console.error('Company save error:', error.response?.data);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      enabledModules: prev.enabledModules?.includes(moduleId)
        ? prev.enabledModules.filter(id => id !== moduleId)
        : [...(prev.enabledModules || []), moduleId]
    }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      admin: {
        ...prev.admin!,
        [name]: value
      }
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{editingCompany ? 'Edit Company' : 'Create New Company'}</CardTitle>
          <CardDescription>{editingCompany ? 'Update company information' : 'Add a new company to the platform'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="companyType">Company Type *</Label>
                <select
                  id="companyType"
                  name="companyType"
                  value={formData.companyType}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyType: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="GOVERNMENT">Government</option>
                  <option value="GOV_GRIEVANCE">Government Grievance</option>
                  <option value="SERVICE_BOOKING">Service Booking</option>
                  <option value="SURVEY_FEEDBACK">Survey & Feedback</option>
                  <option value="LEAD_COLLECTION">Lead Collection</option>
                  <option value="CUSTOM_ENTERPRISE">Custom Enterprise</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  required
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full p-2 border rounded-md"
                placeholder="Company address"
              />
            </div>

            {/* Modules Selection */}
            <div>
              <Label>Enabled Modules</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="flex items-start space-x-2 p-2 border rounded-md">
                    <input
                      type="checkbox"
                      id={module.id}
                      checked={formData.enabledModules?.includes(module.id) || false}
                      onChange={() => handleModuleToggle(module.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={module.id} className="text-sm font-medium cursor-pointer">
                        {module.name}
                      </Label>
                      <p className="text-xs text-gray-500">{module.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Creation Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Create Company Admin</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminForm(!showAdminForm)}
                >
                  {showAdminForm ? 'Remove Admin' : 'Add Admin'}
                </Button>
              </div>
              
              {showAdminForm && (
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminFirstName">Admin First Name *</Label>
                      <Input
                        id="adminFirstName"
                        name="firstName"
                        type="text"
                        value={formData.admin?.firstName || ''}
                        onChange={handleAdminChange}
                        required
                        placeholder="Admin first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminLastName">Admin Last Name *</Label>
                      <Input
                        id="adminLastName"
                        name="lastName"
                        type="text"
                        value={formData.admin?.lastName || ''}
                        onChange={handleAdminChange}
                        required
                        placeholder="Admin last name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminEmail">Admin Email *</Label>
                      <Input
                        id="adminEmail"
                        name="email"
                        type="email"
                        value={formData.admin?.email || ''}
                        onChange={handleAdminChange}
                        required
                        placeholder="admin@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminPassword">Admin Password *</Label>
                      <Input
                        id="adminPassword"
                        name="password"
                        type="password"
                        value={formData.admin?.password || ''}
                        onChange={handleAdminChange}
                        required
                        placeholder="Secure password"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="adminPhone">Admin Phone</Label>
                    <Input
                      id="adminPhone"
                      name="phone"
                      type="tel"
                      value={formData.admin?.phone || ''}
                      onChange={handleAdminChange}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (editingCompany ? 'Updating...' : 'Creating...') : (editingCompany ? 'Update Company' : 'Create Company')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCompanyDialog;
