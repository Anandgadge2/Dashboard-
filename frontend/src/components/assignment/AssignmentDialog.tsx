import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { userAPI, User } from '../../lib/api/user';
import { departmentAPI, Department } from '../../lib/api/department';
import { UserCircle, Building2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string, departmentId?: string) => Promise<void>;
  itemType: 'grievance' | 'appointment';
  itemId: string; 
  companyId: string;
  currentAssignee?: string | { _id: string; firstName: string; lastName: string };
  currentDepartmentId?: string;
  userRole?: string;
  userDepartmentId?: string;
}

export default function AssignmentDialog({
  isOpen,
  onClose,
  onAssign,
  itemType,
  itemId,
  companyId,
  currentAssignee,
  currentDepartmentId,
  userRole,
  userDepartmentId
}: AssignmentDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchUsers(); // Fetch all users when dialog opens
      setSearchQuery('');
    } else {
      // Reset when dialog closes
      setUsers([]);
    }
  }, [isOpen, companyId]);

  // Auto-select first department or current department
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      if (currentDepartmentId) {
        setSelectedDepartment(currentDepartmentId);
      } else {
        setSelectedDepartment(departments[0]._id);
      }
    }
  }, [departments, currentDepartmentId]);

  const fetchDepartments = async () => {
    try {
      const deptRes = await departmentAPI.getAll({ companyId });
      if (deptRes.success) {
        // Filter departments for department admins
        let depts = deptRes.data.departments;
        if (userRole === 'DEPARTMENT_ADMIN' && userDepartmentId) {
          depts = depts.filter(d => d._id === userDepartmentId);
        }
        setDepartments(depts);
      }
    } catch (error) {
      toast.error('Failed to load departments');
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch ALL users in the company
      const usersRes = await userAPI.getAll({ 
        companyId,
        limit: 1000 // Increased limit to get all users
      });
      if (usersRes.success) {
        // Show all users in the company (no role filtering)
        setUsers(usersRes.data.users);
        console.log('Loaded users:', usersRes.data.users.length);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigning(true);
    
    // Find the user being assigned to for better feedback
    const assignedUser = users.find(u => u._id === userId);
    const userName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'officer';
    
    // Show loading toast
    const toastId = toast.loading(`Assigning to ${userName}...`);
    
    try {
      const userDeptId = assignedUser?.departmentId 
        ? (typeof assignedUser.departmentId === 'object' ? assignedUser.departmentId._id : assignedUser.departmentId)
        : undefined;
      
      await onAssign(userId, userDeptId);
      
      // Show department transfer message if applicable
      if (userDeptId && currentDepartmentId && userDeptId !== currentDepartmentId) {
        const newDept = departments.find(d => d._id === userDeptId);
        toast.success(
          `${itemType === 'grievance' ? 'Grievance' : 'Appointment'} assigned to ${userName} and transferred to ${newDept?.name || 'new department'}`,
          { id: toastId, duration: 4000 }
        );
      } else {
        toast.success(`Successfully assigned to ${userName}!`, { id: toastId });
      }
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign', { id: toastId });
    } finally {
      setAssigning(false);
    }
  };

  const getCurrentAssigneeName = () => {
    if (!currentAssignee) return 'Unassigned';
    if (typeof currentAssignee === 'string') return currentAssignee;
    return `${currentAssignee.firstName} ${currentAssignee.lastName}`;
  };

  const filteredUsers = users.filter(user => {
    // Filter by selected department
    if (selectedDepartment) {
      const userDeptId = typeof user.departmentId === 'object' 
        ? user.departmentId?._id 
        : user.departmentId;
      if (userDeptId !== selectedDepartment) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || 
             user.email.toLowerCase().includes(query) ||
             user.userId.toLowerCase().includes(query);
    }

    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Assign {itemType === 'grievance' ? 'Grievance' : 'Appointment'}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Current Assignee: <span className="font-semibold">{getCurrentAssigneeName()}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
              disabled={userRole === 'DEPARTMENT_ADMIN'}
            >
              <option value="" disabled>Select Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const userDept = typeof user.departmentId === 'object' 
                    ? user.departmentId 
                    : null;
                  const isCurrentAssignee = typeof currentAssignee === 'object' && currentAssignee !== null
                    ? currentAssignee._id === user._id 
                    : false;

                  return (
                    <div
                      key={user._id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        isCurrentAssignee ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </h4>
                            {isCurrentAssignee && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500 font-mono">{user.userId}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                              {user.role}
                            </span>
                            {userDept && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Building2 className="w-3 h-3 mr-1" />
                                {userDept.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAssign(user._id)}
                          disabled={assigning || isCurrentAssignee}
                          variant={isCurrentAssignee ? "outline" : "default"}
                          size="sm"
                        >
                          {isCurrentAssignee ? 'Assigned' : 'Assign'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
