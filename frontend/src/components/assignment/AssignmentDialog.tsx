import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { userAPI, User } from '../../lib/api/user';
import { departmentAPI, Department } from '../../lib/api/department';
import { UserCircle, Building2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner';

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
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      setSearchQuery('');
      // Don't fetch users yet - wait for department selection
    } else {
      // Reset when dialog closes
      setUsers([]);
      setSelectedDepartment('');
      setAssigningUserId(null); // Reset assigning state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [departments, currentDepartmentId, selectedDepartment]);

  // Fetch users when department is selected (optimized)
  useEffect(() => {
    if (isOpen && selectedDepartment) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, isOpen]);

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
    if (!selectedDepartment) return;
    
    setLoading(true);
    try {
      // Only fetch users for the selected department (much faster)
      const usersRes = await userAPI.getAll({ 
        companyId,
        departmentId: selectedDepartment,
        limit: 100 // Reasonable limit per department
      });
      if (usersRes.success) {
        setUsers(usersRes.data.users);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigningUserId(userId); // Track which specific user is being assigned
    
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
      setAssigningUserId(null); // Reset after assignment completes
    }
  };

  const getCurrentAssigneeName = () => {
    if (!currentAssignee) return 'Unassigned';
    if (typeof currentAssignee === 'string') return currentAssignee;
    return `${currentAssignee.firstName} ${currentAssignee.lastName}`;
  };

  // Memoize filtered users for better performance
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return fullName.includes(query) || 
             user.email.toLowerCase().includes(query) ||
             user.userId.toLowerCase().includes(query);
    });
  }, [users, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Assign {itemType === 'grievance' ? 'Grievance' : 'Appointment'}
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Current Assignee: <span className="font-semibold text-slate-900">{getCurrentAssigneeName()}</span>
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
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
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
          <div className="flex-1 overflow-y-auto border rounded-lg custom-scrollbar">
            {!selectedDepartment ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">Please select a department to view users</p>
              </div>
            ) : loading ? (
              <div className="p-8 text-center">
                <LoadingSpinner size="md" text="Loading users..." />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600">No users found in this department</p>
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
                      className={`p-4 hover:bg-slate-50 transition-all duration-200 ${
                        isCurrentAssignee ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
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
                          disabled={assigningUserId !== null || isCurrentAssignee}
                          variant={isCurrentAssignee ? "outline" : "default"}
                          size="sm"
                          className="min-w-[80px]"
                        >
                          {assigningUserId === user._id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Assigning...
                            </>
                          ) : isCurrentAssignee ? (
                            'Assigned'
                          ) : (
                            'Assign'
                          )}
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
