'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api/client';
import { companyAPI, Company } from '@/lib/api/company';
import { departmentAPI, Department } from '@/lib/api/department';
import { userAPI, User } from '@/lib/api/user';
import { grievanceAPI, Grievance } from '@/lib/api/grievance';
import { appointmentAPI, Appointment } from '@/lib/api/appointment';
import CreateDepartmentDialog from '@/components/department/CreateDepartmentDialog';
import CreateUserDialog from '@/components/user/CreateUserDialog';
import EditUserDialog from '@/components/user/EditUserDialog';
import ChangePermissionsDialog from '@/components/user/ChangePermissionsDialog';
import { ProtectedButton } from '@/components/ui/ProtectedButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Permission, hasPermission } from '@/lib/permissions';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import GrievanceDetailDialog from '@/components/grievance/GrievanceDetailDialog';
import AppointmentDetailDialog from '@/components/appointment/AppointmentDetailDialog';
import AssignmentDialog from '@/components/assignment/AssignmentDialog';
import MetricInfoDialog, { MetricInfo } from '@/components/analytics/MetricInfoDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  ArrowUpDown,
  Phone,
  UserPlus,
  UserCog,
  Key,
  UserMinus,
  ChevronUp, 
  ChevronDown, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Building, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface DashboardStats {
  grievances: {
    total: number;
    pending: number;
    assigned?: number;
    inProgress: number;
    resolved: number;
    closed?: number;
    last7Days: number;
    last30Days: number;
    resolutionRate: number;
    slaBreached?: number;
    slaComplianceRate?: number;
    avgResolutionDays?: number;
    byPriority?: Array<{ priority: string; count: number }>;
    daily: Array<{ date: string; count: number }>;
    monthly?: Array<{ month: string; count: number; resolved: number }>;
  };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled?: number;
    noShow?: number;
    last7Days: number;
    last30Days: number;
    completionRate: number;
    byDepartment?: Array<{ departmentId: string; departmentName: string; count: number; completed: number }>;
    daily: Array<{ date: string; count: number }>;
    monthly?: Array<{ month: string; count: number; completed: number }>;
  };
  departments: number;
  users: number;
  activeUsers: number;
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showChangePermissionsDialog, setShowChangePermissionsDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [showGrievanceDetail, setShowGrievanceDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [showGrievanceAssignment, setShowGrievanceAssignment] = useState(false);
  const [selectedGrievanceForAssignment, setSelectedGrievanceForAssignment] = useState<Grievance | null>(null);
  const [showAppointmentAssignment, setShowAppointmentAssignment] = useState(false);
  const [selectedAppointmentForAssignment, setSelectedAppointmentForAssignment] = useState<Appointment | null>(null);
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricInfo | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
    tab: string;
  }>({
    key: '',
    direction: null,
    tab: 'grievances'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (!loading && user && user.role === 'SUPER_ADMIN') {
      router.push('/superadmin/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (mounted && user && user.role !== 'SUPER_ADMIN') {
      fetchDashboardData();
      fetchDepartments();
      fetchUsers();
      fetchGrievances();
      fetchAppointments();
      if (user.companyId) {
        fetchCompany();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user]);

  useEffect(() => {
    if (mounted && user && activeTab === 'analytics') {
      fetchPerformanceData();
      fetchHourlyData();
      fetchCategoryData();
    }
  }, [mounted, user, activeTab]);

  const fetchPerformanceData = async () => {
    try {
      const response = await apiClient.get('/analytics/performance');
      if (response.success) {
        setPerformanceData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const fetchHourlyData = async () => {
    try {
      const response = await apiClient.get('/analytics/hourly?days=7');
      if (response.success) {
        setHourlyData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch hourly data:', error);
    }
  };

  const fetchCategoryData = async () => {
    try {
      const response = await apiClient.get('/analytics/category');
      if (response.success) {
        setCategoryData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch category data:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      const response = await apiClient.get<{ success: boolean; data: DashboardStats }>('/analytics/dashboard');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCompany = async () => {
    if (!user || user.role !== 'COMPANY_ADMIN') return;
    
    try {
      const response = await companyAPI.getMyCompany();
      if (response.success) {
        setCompany(response.data.company);
      }
    } catch (error: any) {
      // CompanyAdmin might not have company associated
      console.log('Company details not available:', error.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAll();
      if (response.success) {
        setDepartments(response.data.departments);
      }
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll();
      if (response.success) {
        let filteredUsers = response.data.users;
        
        // Filter users by department for department admins
        if (isDepartmentAdmin && user?.departmentId) {
          const userDeptId = typeof user.departmentId === 'object' && user.departmentId !== null 
            ? user.departmentId._id 
            : user.departmentId;
          
          filteredUsers = filteredUsers.filter((u: any) => {
            const uDeptId = typeof u.departmentId === 'object' && u.departmentId !== null
              ? u.departmentId._id
              : u.departmentId;
            return uDeptId === userDeptId;
          });
        }
        
        setUsers(filteredUsers);
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchGrievances = async () => {
    setLoadingGrievances(true);
    try {
      const response = await grievanceAPI.getAll({ limit: 50 });
      if (response.success) {
        setGrievances(response.data.grievances);
      }
    } catch (error: any) {
      console.error('Failed to fetch grievances:', error);
      toast.error('Failed to load grievances');
    } finally {
      setLoadingGrievances(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const response = await appointmentAPI.getAll({ limit: 50 });
      if (response.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error: any) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleSort = (key: string, tab: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction, tab });
  };

  const getSortedData = (data: any[], tab: string) => {
    if (sortConfig.tab !== tab || !sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle nested objects (like department name)
      if (sortConfig.key.includes('.')) {
        const parts = sortConfig.key.split('.');
        aValue = parts.reduce((obj, key) => obj?.[key], a);
        bValue = parts.reduce((obj, key) => obj?.[key], b);
      }

      // String comparison
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      // Date or number comparison
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    // Prevent self-deactivation
    if (user && userId === user.id) {
      toast.error('You cannot deactivate yourself');
      return;
    }

    try {
      const response = await userAPI.update(userId, { isActive: !currentStatus } as any);
      if (response.success) {
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user status';
      toast.error(errorMessage);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role === 'SUPER_ADMIN') {
    return null;
  }

  const isCompanyAdmin = user.role === 'COMPANY_ADMIN';
  const isDepartmentAdmin = user.role === 'DEPARTMENT_ADMIN';
  const isOperator = user.role === 'OPERATOR';
  const isAnalyticsViewer = user.role === 'ANALYTICS_VIEWER';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isCompanyAdmin && 'Zilla Parishad Admin Dashboard'}
                {isDepartmentAdmin && 'Department Admin Dashboard'}
                {isOperator && 'Operator Dashboard'}
                {isAnalyticsViewer && 'Analytics Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.firstName} {user.lastName}
              </p>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {user && hasPermission(user.role, Permission.READ_GRIEVANCE) && (
              <TabsTrigger value="grievances">Grievances</TabsTrigger>
            )}
            {user && hasPermission(user.role, Permission.READ_APPOINTMENT) && (
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
            )}
            {(isCompanyAdmin || isDepartmentAdmin) && (
              <TabsTrigger value="departments">Departments</TabsTrigger>
            )}
            {(isCompanyAdmin || isDepartmentAdmin) && (
              <TabsTrigger value="users">Users</TabsTrigger>
            )}
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid - Moved to top */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats && (
                <>
                  <Card 
                    className="bg-gradient-to-br from-blue-400 to-blue-500 text-white border-0 shadow-lg hover:shadow-blue-200/50 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setActiveTab('grievances');
                      // Filter to show all grievances
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center justify-between">
                        <span>Total Grievances</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.grievances.total}</p>
                      <p className="text-blue-100 text-sm mt-2">
                        {stats.grievances.pending} pending
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-green-300 to-green-400 text-white border-0 shadow-lg hover:shadow-green-200/50 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setActiveTab('grievances');
                      // Could filter to show only resolved
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center justify-between">
                        <span>Resolved</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.grievances.resolved}</p>
                      <p className="text-green-100 text-sm mt-2">
                        {stats.grievances.inProgress} in progress
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-purple-300 to-purple-400 text-white border-0 shadow-lg hover:shadow-purple-200/50 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setActiveTab('appointments');
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center justify-between">
                        <span>Appointments</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.appointments.total}</p>
                      <p className="text-purple-100 text-sm mt-2">
                        {stats.appointments.confirmed} confirmed
                      </p>
                    </CardContent>
                  </Card>

                  {isCompanyAdmin && (
                    <Card 
                      className="bg-gradient-to-br from-orange-300 to-orange-400 text-white border-0 shadow-lg hover:shadow-orange-200/50 transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setActiveTab('departments');
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center justify-between">
                          <span>Departments</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold">{stats.departments}</p>
                        <p className="text-orange-100 text-sm mt-2">Active departments</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Company Info (for Company Admin) - Moved below tiles */}
            {isCompanyAdmin && company && (
              <Card className="overflow-hidden border-0 shadow-lg bg-white">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Building className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{company.name}</h3>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Company Profile</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                        {company.companyType}
                      </span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-b border-gray-100">
                    <div className="p-6">
                      <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <UserIcon className="w-3.5 h-3.5 mr-1.5" />
                        Total Users
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-gray-900">{users.length}</span>
                        <span className="text-xs text-green-500 font-bold">Active</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <Building className="w-3.5 h-3.5 mr-1.5" />
                        Departments
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-gray-900">{departments.length}</span>
                        <span className="text-xs text-blue-500 font-bold">Managed</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Contact Email
                      </div>
                      <div className="text-sm font-bold text-gray-900 truncate">{company.contactEmail}</div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Contact Phone
                      </div>
                      <div className="text-sm font-bold text-gray-900">{company.contactPhone}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      <div className="flex items-center space-x-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Grievances</span>
                          <div className="flex items-center mt-1">
                            <span className="text-sm font-bold text-gray-900">{stats?.grievances.total || 0}</span>
                            <span className="mx-2 text-gray-300 text-[10px]|">|</span>
                            <span className="text-xs font-medium text-amber-600">{stats?.grievances.pending || 0} Pending</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Appointments</span>
                          <div className="flex items-center mt-1">
                            <span className="text-sm font-bold text-gray-900">{stats?.appointments.total || 0}</span>
                            <span className="mx-2 text-gray-300 text-[10px]|">|</span>
                            <span className="text-xs font-medium text-purple-600">{stats?.appointments.confirmed || 0} Confirmed</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-500">System Online</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isCompanyAdmin && (
                  <>
                    <ProtectedButton
                      permission={Permission.CREATE_DEPARTMENT}
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveTab('departments')}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Manage Departments
                    </ProtectedButton>
                    <ProtectedButton
                      permission={Permission.CREATE_USER}
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveTab('users')}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Manage Users
                    </ProtectedButton>
                  </>
                )}
                <ProtectedButton
                  permission={Permission.VIEW_ANALYTICS}
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setActiveTab('analytics')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Analytics
                </ProtectedButton>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          {(isCompanyAdmin || isDepartmentAdmin) && (
            <TabsContent value="departments" className="space-y-6">
              {isDepartmentAdmin ? (
                // Department Admin View - Show only their department
                <Card>
                  <CardHeader>
                    <CardTitle>My Department</CardTitle>
                    <CardDescription>
                      View your department information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {departments.length > 0 ? (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 h-16 w-16 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Building className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{departments[0].name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-gray-600 font-medium">Department ID</p>
                                <p className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200 inline-block mt-1">
                                  {departments[0].departmentId}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">Status</p>
                                <span className="px-3 py-1 inline-flex items-center text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 mt-1">
                                  Active
                                </span>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-sm text-gray-600 font-medium">Description</p>
                                <p className="text-sm text-gray-700 mt-1">
                                  {departments[0].description || 'No description provided'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No department information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                // Company Admin View - Show all departments
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Department Management</CardTitle>
                        <CardDescription>
                          Manage all departments in your company
                        </CardDescription>
                      </div>
                      <ProtectedButton
                        permission={Permission.CREATE_DEPARTMENT}
                        onClick={() => setShowDepartmentDialog(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Department
                      </ProtectedButton>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {departments.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No departments found</p>
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                          <table className="w-full relative border-collapse">
                            <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-left">
                                  <button 
                                    onClick={() => handleSort('name', 'departments')}
                                    className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                  >
                                    <span>Department Name</span>
                                    <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'name' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left">
                                  <button 
                                    onClick={() => handleSort('departmentId', 'departments')}
                                    className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                  >
                                    <span>Dept ID</span>
                                    <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'departmentId' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left font-bold text-[11px] text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right font-bold text-[11px] text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {getSortedData(departments, 'departments').map((dept) => (
                                <tr key={dept._id} className="hover:bg-gray-50/50 transition-colors duration-150 group/row">
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                        <Building className="w-5 h-5" />
                                      </div>
                                      <div className="ml-3">
                                        <div 
                                          className="text-sm font-bold text-gray-900 group-hover:text-blue-600 cursor-pointer hover:underline"
                                          onClick={() => {
                                            setSelectedDepartmentId(dept._id);
                                            router.push(`/dashboard/department/${dept._id}`);
                                          }}
                                        >
                                          {dept.name}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                                      {dept.departmentId}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5">
                                    <p className="text-sm text-gray-500 truncate max-w-xs">{dept.description || 'No description provided'}</p>
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 ring-1 ring-emerald-200 shadow-sm">
                                      Active
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end items-center space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        onClick={() => {
                                          setEditingDepartment(dept);
                                          setShowDepartmentDialog(true);
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        onClick={() => {
                                          setConfirmDialog({
                                            isOpen: true,
                                            title: 'Delete Department',
                                            message: `Are you sure you want to delete "${dept.name}"? This action cannot be undone and will delete all associated users, grievances, and appointments.`,
                                            onConfirm: async () => {
                                              try {
                                                const response = await departmentAPI.delete(dept._id);
                                                if (response.success) {
                                                  toast.success('Department deleted successfully');
                                                  fetchDepartments();
                                                }
                                              } catch (error: any) {
                                                toast.error(error.message || 'Failed to delete department');
                                              } finally {
                                                setConfirmDialog(p => ({ ...p, isOpen: false }));
                                              }
                                            },
                                            variant: 'danger'
                                          } as any);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Users Tab */}
          {(isCompanyAdmin || isDepartmentAdmin) && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        {isCompanyAdmin ? 'Manage users in your company' : 'Manage users in your department'}
                      </CardDescription>
                    </div>
                    {hasPermission(user?.role || '', Permission.CREATE_USER) && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowUserDialog(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add User
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No users found</p>
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full relative border-collapse">
                          <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm">
                            <tr className="border-b border-gray-100">
                              <th className="px-6 py-4 text-left">
                                <button 
                                  onClick={() => handleSort('firstName', 'users')}
                                  className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                  <span>User Info</span>
                                  <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'firstName' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                </button>
                              </th>
                              <th className="px-6 py-4 text-left">
                                <button 
                                  onClick={() => handleSort('email', 'users')}
                                  className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                  <span>Contact Information</span>
                                  <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'email' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                </button>
                              </th>
                              <th className="px-6 py-4 text-left">
                                <button 
                                  onClick={() => handleSort('role', 'users')}
                                  className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                  <span>Role & Dept</span>
                                  <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'role' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                </button>
                              </th>
                              <th className="px-6 py-4 text-left">
                                <button 
                                  onClick={() => handleSort('isActive', 'users')}
                                  className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                  <span>Status & Access</span>
                                  <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'isActive' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                </button>
                              </th>
                              <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {getSortedData(users, 'users').map((u: User) => (
                              <tr key={u._id} className="hover:bg-gray-50/50 transition-colors duration-150 group/row">
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="relative">
                                      <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm border-2 border-white ring-1 ring-gray-100">
                                        {u.firstName[0]}{u.lastName[0]}
                                      </div>
                                      <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 border-2 border-white rounded-full shadow-sm ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-bold text-gray-900 leading-tight">
                                        {u.firstName} {u.lastName}
                                      </div>
                                      <div className="mt-1">
                                        <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-tighter">
                                          ID: {u.userId}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex flex-col space-y-1.5">
                                    <div className="flex items-center text-sm text-blue-600 font-medium">
                                      <Mail className="w-3.5 h-3.5 mr-2 text-blue-400" />
                                      {u.email}
                                    </div>
                                    {u.phone && (
                                      <div className="flex items-center text-xs text-gray-500">
                                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                        {u.phone}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex">
                                      <span className={`px-2.5 py-0.5 inline-flex items-center text-[10px] font-bold rounded-full border shadow-sm ${
                                        u.role === 'COMPANY_ADMIN' ? 'bg-red-50 text-red-700 border-red-100 ring-1 ring-red-200' :
                                        u.role === 'DEPARTMENT_ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-100 ring-1 ring-blue-200' :
                                        'bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-200'
                                      }`}>
                                        <Shield className="w-2.5 h-2.5 mr-1" />
                                        {u.role.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 font-medium ml-1">
                                      <Building className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                      {typeof u.departmentId === 'object' && u.departmentId ? u.departmentId.name : 'All Company Access'}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex flex-col space-y-2.5">
                                    <div className="flex items-center">
                                      <div className={`h-2 w-2 rounded-full mr-2 ${u.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                      <span className={`text-xs font-bold ${u.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                                        {u.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>
                                    <div className="flex items-center">
                                      <button 
                                        onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                                        disabled={user && u._id === user.id}
                                        className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                          user && u._id === user.id 
                                            ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                                            : u.isActive 
                                              ? 'bg-green-500 cursor-pointer' 
                                              : 'bg-red-400 cursor-pointer'
                                        }`}
                                        title={user && u._id === user.id ? 'You cannot deactivate yourself' : 'Toggle user status'}
                                      >
                                        <span className="sr-only">Toggle user status</span>
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${u.isActive ? 'translate-x-5' : 'translate-x-1'}`}
                                        />
                                      </button>
                                      <button 
                                        onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                                        disabled={user && u._id === user.id}
                                        className={`ml-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                          user && u._id === user.id 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : u.isActive 
                                              ? 'text-red-500 hover:text-red-600 hover:underline' 
                                              : 'text-green-600 hover:text-green-700 hover:underline'
                                        }`}
                                        title={user && u._id === user.id ? 'You cannot deactivate yourself' : u.isActive ? 'Deactivate' : 'Activate'}
                                      >
                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-right">
                                  <div className="flex justify-end items-center space-x-2">
                                    {hasPermission(user?.role || '', Permission.UPDATE_USER) && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit User"
                                        onClick={() => {
                                          setEditingUser(u);
                                          setShowEditUserDialog(true);
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {hasPermission(user?.role || '', Permission.UPDATE_USER) && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                        title="Change Permissions"
                                        onClick={() => {
                                          setEditingUser(u);
                                          setShowChangePermissionsDialog(true);
                                        }}
                                      >
                                        <Shield className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {hasPermission(user?.role || '', Permission.DELETE_USER) && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className={`h-8 w-8 p-0 transition-colors ${
                                          user && u._id === user.id 
                                            ? 'text-gray-300 cursor-not-allowed' 
                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                        }`}
                                        title={user && u._id === user.id ? 'You cannot delete yourself' : 'Delete User'}
                                        disabled={user && u._id === user.id}
                                        onClick={() => {
                                          // Prevent self-deletion
                                          if (user && u._id === user.id) {
                                            toast.error('You cannot delete yourself');
                                            return;
                                          }
                                          
                                          setConfirmDialog({
                                            isOpen: true,
                                            title: 'Delete User',
                                            message: `Are you sure you want to delete ${u.firstName} ${u.lastName}? This action cannot be undone.`,
                                            onConfirm: async () => {
                                              try {
                                                const response = await userAPI.delete(u._id);
                                                if (response.success) {
                                                  toast.success('User deleted successfully');
                                                  fetchUsers();
                                                }
                                              } catch (error: any) {
                                                const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
                                                toast.error(errorMessage);
                                              } finally {
                                                setConfirmDialog(p => ({ ...p, isOpen: false }));
                                              }
                                            }
                                          } as any);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Grievances Tab */}
          <TabsContent value="grievances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grievances</CardTitle>
                <CardDescription>View and manage grievances</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGrievances ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading grievances...</p>
                  </div>
                ) : grievances.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No grievances found</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      <table className="w-full relative border-collapse">
                        <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm border-b">
                          <tr className="whitespace-nowrap underline-offset-4">
                            <th className="px-4 py-3 text-left">
                              <button 
                                onClick={() => handleSort('grievanceId', 'grievances')}
                                className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                              >
                                <span>App No</span>
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'grievanceId' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button 
                                onClick={() => handleSort('citizenName', 'grievances')}
                                className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                              >
                                <span>Citizen</span>
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'citizenName' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button 
                                onClick={() => handleSort('category', 'grievances')}
                                className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                              >
                                <span>Dept & Category</span>
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'category' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button 
                                onClick={() => handleSort('status', 'grievances')}
                                className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                              >
                                <span>Status</span>
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'status' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button 
                                onClick={() => handleSort('createdAt', 'grievances')}
                                className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                              >
                                <span>Raised On</span>
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'createdAt' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {getSortedData(grievances, 'grievances').map((grievance) => (
                            <tr key={grievance._id} className="hover:bg-blue-50/50 transition-colors duration-150">
                            <td className="px-4 py-4">
                              <span className="font-bold text-sm text-blue-700">{grievance.grievanceId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await grievanceAPI.getById(grievance._id);
                                      if (response.success) {
                                        setSelectedGrievance(response.data.grievance);
                                        setShowGrievanceDetail(true);
                                      }
                                    } catch (error: any) {
                                      toast.error('Failed to load grievance details');
                                    }
                                  }}
                                  className="text-gray-900 font-bold text-sm text-left hover:text-blue-600 hover:underline"
                                >
                                  {grievance.citizenName}
                                </button>
                                <span className="text-xs text-gray-500">{grievance.citizenPhone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-700">
                                  {typeof grievance.departmentId === 'object' && grievance.departmentId ? (grievance.departmentId as any).name : 'General'}
                                </span>
                                <span className="text-[10px] text-orange-400 uppercase">{grievance.category}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={grievance.status}
                                onChange={async (e) => {
                                  try {
                                    const response = await grievanceAPI.updateStatus(grievance._id, e.target.value);
                                    if (response.success) {
                                      toast.success('Status updated successfully');
                                      fetchGrievances();
                                    } else {
                                      toast.error('Failed to update status');
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to update status');
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded bg-white hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase tracking-tight"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="ASSIGNED">ASSIGNED</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                              </select>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-600">
                              <div className="flex flex-col">
                                <span className="font-medium">{new Date(grievance.createdAt).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-400">{new Date(grievance.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGrievanceForAssignment(grievance);
                                    setShowGrievanceAssignment(true);
                                  }}
                                  title="Assign"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await grievanceAPI.getById(grievance._id);
                                      if (response.success) {
                                        setSelectedGrievance(response.data.grievance);
                                        setShowGrievanceDetail(true);
                                      }
                                    } catch (error: any) {
                                      toast.error('Failed to load details');
                                    }
                                  }}
                                  title="View"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>View and manage appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No appointments found</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      <table className="w-full relative border-collapse">
                        <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm border-b">
                        <tr className="whitespace-nowrap">
                          <th className="px-4 py-3 text-left">
                            <button 
                              onClick={() => handleSort('appointmentId', 'appointments')}
                              className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
                            >
                              <span>App ID</span>
                              <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'appointmentId' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <button 
                              onClick={() => handleSort('citizenName', 'appointments')}
                              className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
                            >
                              <span>Citizen</span>
                              <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'citizenName' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <button 
                              onClick={() => handleSort('purpose', 'appointments')}
                              className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
                            >
                              <span>Dept & Purpose</span>
                              <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'purpose' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <button 
                              onClick={() => handleSort('appointmentDate', 'appointments')}
                              className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
                            >
                              <span>Scheduled At</span>
                              <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'appointmentDate' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <button 
                              onClick={() => handleSort('status', 'appointments')}
                              className="group flex items-center space-x-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
                            >
                              <span>Status</span>
                              <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortConfig.key === 'status' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedData(appointments, 'appointments').map((appointment) => (
                          <tr key={appointment._id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-4">
                              <span className="font-bold text-sm text-purple-700">{appointment.appointmentId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await appointmentAPI.getById(appointment._id);
                                      if (response.success) {
                                        setSelectedAppointment(response.data.appointment);
                                        setShowAppointmentDetail(true);
                                      }
                                    } catch (error: any) {
                                      toast.error('Failed to load details');
                                    }
                                  }}
                                  className="text-gray-900 font-bold text-sm text-left hover:text-purple-600 hover:underline"
                                >
                                  {appointment.citizenName}
                                </button>
                                <span className="text-xs text-gray-500">{appointment.citizenPhone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col max-w-[150px]">
                                <span className="text-xs font-semibold text-gray-700 truncate">
                                  {typeof appointment.departmentId === 'object' && appointment.departmentId ? (appointment.departmentId as any).name : 'General'}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate italic">{appointment.purpose}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-700">{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                                <span className="text-[10px] text-amber-600 font-medium">{appointment.appointmentTime}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={appointment.status}
                                onChange={async (e) => {
                                  try {
                                    const response = await appointmentAPI.updateStatus(appointment._id, e.target.value);
                                    if (response.success) {
                                      toast.success('Status updated successfully');
                                      fetchAppointments();
                                    } else {
                                      toast.error('Failed to update status');
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to update status');
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded bg-white hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase tracking-tight"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="CONFIRMED">CONFIRMED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="NO_SHOW">NO_SHOW</option>
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointmentForAssignment(appointment);
                                    setShowAppointmentAssignment(true);
                                  }}
                                  title="Assign"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await appointmentAPI.getById(appointment._id);
                                      if (response.success) {
                                        setSelectedAppointment(response.data.appointment);
                                        setShowAppointmentDetail(true);
                                      }
                                    } catch (error: any) {
                                      toast.error('Failed to load details');
                                    }
                                  }}
                                  title="View"
                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>View statistics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="py-20">
                    <LoadingSpinner size="lg" text="Loading analytics..." />
                  </div>
                ) : stats ? (
                  <div className="space-y-6">
                    {/* Interactive Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card 
                        className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                        onClick={() => {
                          const resolutionRate = stats.grievances.total > 0 
                            ? ((stats.grievances.resolved / stats.grievances.total) * 100).toFixed(1)
                            : '0.0';
                          setSelectedMetric({
                            title: 'Resolution Rate',
                            description: 'The percentage of grievances that have been successfully resolved out of all grievances received.',
                            formula: '(Resolved Grievances ÷ Total Grievances) × 100',
                            interpretation: `A resolution rate of ${resolutionRate}% means that ${stats.grievances.resolved} out of ${stats.grievances.total} grievances have been resolved. Industry benchmark is typically 70-85%. ${parseFloat(resolutionRate) >= 70 ? 'Your performance is good!' : 'Consider improving resolution processes.'}`,
                            currentValue: `${resolutionRate}%`,
                            benchmark: '70-85% (Industry Standard)',
                            icon: 'trending'
                          });
                          setShowMetricDialog(true);
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="text-sm font-semibold text-green-800 flex items-center justify-between">
                            <span>Resolution Rate</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-green-700">
                            {stats.grievances.total > 0 
                              ? ((stats.grievances.resolved / stats.grievances.total) * 100).toFixed(1)
                              : '0.0'}%
                          </div>
                          <p className="text-sm text-green-600 mt-2 font-medium">
                            {stats.grievances.resolved} of {stats.grievances.total} resolved
                          </p>
                          <p className="text-xs text-green-500 mt-1">Click for details</p>
                        </CardContent>
                      </Card>

                      <Card 
                        className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                        onClick={() => {
                          const completionRate = stats.appointments.total > 0 
                            ? ((stats.appointments.completed / stats.appointments.total) * 100).toFixed(1)
                            : '0.0';
                          setSelectedMetric({
                            title: 'Completion Rate',
                            description: 'The percentage of appointments that have been successfully completed out of all scheduled appointments.',
                            formula: '(Completed Appointments ÷ Total Appointments) × 100',
                            interpretation: `A completion rate of ${completionRate}% indicates that ${stats.appointments.completed} out of ${stats.appointments.total} appointments were completed. A good completion rate is above 75%. ${parseFloat(completionRate) >= 75 ? 'Excellent performance!' : 'Consider reducing no-shows and cancellations.'}`,
                            currentValue: `${completionRate}%`,
                            benchmark: '75-90% (Target Range)',
                            icon: 'target'
                          });
                          setShowMetricDialog(true);
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center justify-between">
                            <span>Completion Rate</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-bold text-blue-700">
                            {stats.appointments.total > 0 
                              ? ((stats.appointments.completed / stats.appointments.total) * 100).toFixed(1)
                              : '0.0'}%
                          </div>
                          <p className="text-sm text-blue-600 mt-2 font-medium">
                            {stats.appointments.completed} of {stats.appointments.total} completed
                          </p>
                          <p className="text-xs text-blue-500 mt-1">Click for details</p>
                        </CardContent>
                      </Card>

                      {stats.grievances.slaComplianceRate !== undefined && (
                        <Card 
                          className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                          onClick={() => {
                            const slaBreaches = stats.grievances.slaBreached || 0;
                            const slaCompliance = stats.grievances.slaComplianceRate?.toFixed(1) || '0.0';
                            setSelectedMetric({
                              title: 'SLA Compliance',
                              description: 'Service Level Agreement compliance measures the percentage of grievances resolved within the defined time frame.',
                              formula: '((Total Grievances - SLA Breaches) ÷ Total Grievances) × 100',
                              interpretation: `An SLA compliance of ${slaCompliance}% means ${stats.grievances.total - slaBreaches} out of ${stats.grievances.total} grievances were resolved within the SLA timeframe. ${slaBreaches} grievances breached the SLA. Target is 90%+ compliance. ${parseFloat(slaCompliance) >= 90 ? 'Outstanding compliance!' : 'Focus on reducing resolution times.'}`,
                              currentValue: `${slaCompliance}%`,
                              benchmark: '90%+ (Target)',
                              icon: 'target'
                            });
                            setShowMetricDialog(true);
                          }}
                        >
                          <CardHeader>
                            <CardTitle className="text-sm font-semibold text-purple-800 flex items-center justify-between">
                              <span>SLA Compliance</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-4xl font-bold text-purple-700">
                              {stats.grievances.slaComplianceRate?.toFixed(1)}%
                            </div>
                            <p className="text-sm text-purple-600 mt-2 font-medium">
                              {stats.grievances.slaBreached || 0} breaches
                            </p>
                            <p className="text-xs text-purple-500 mt-1">Click for details</p>
                          </CardContent>
                        </Card>
                      )}

                      {stats.grievances.avgResolutionDays !== undefined && (
                        <Card 
                          className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                          onClick={() => {
                            const avgDays = stats.grievances.avgResolutionDays?.toFixed(1) || '0.0';
                            setSelectedMetric({
                              title: 'Avg Resolution Time',
                              description: 'The average number of days taken to resolve a grievance from the time it was created to resolution.',
                              formula: 'Sum of (Resolution Date - Creation Date) ÷ Number of Resolved Grievances',
                              interpretation: `On average, it takes ${avgDays} days to resolve a grievance. Industry best practice is 3-5 days for standard grievances. ${parseFloat(avgDays) <= 5 ? 'Excellent response time!' : 'Consider streamlining resolution processes to reduce time.'}`,
                              currentValue: `${avgDays} days`,
                              benchmark: '3-5 days (Best Practice)',
                              icon: 'calculator'
                            });
                            setShowMetricDialog(true);
                          }}
                        >
                          <CardHeader>
                            <CardTitle className="text-sm font-semibold text-orange-800 flex items-center justify-between">
                              <span>Avg Resolution Time</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-4xl font-bold text-orange-700">
                              {stats.grievances.avgResolutionDays?.toFixed(1)}
                            </div>
                            <p className="text-sm text-orange-600 mt-2 font-medium">Days</p>
                            <p className="text-xs text-orange-500 mt-1">Click for details</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* STATUS DISTRIBUTION CHARTS */}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Grievance Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <defs>
                                <linearGradient id="grievancePending" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FFBB28" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#FFBB28" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="grievanceInProgress" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="grievanceResolved" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0.7}/>
                                </linearGradient>
                              </defs>
                              <Pie
                                data={[
                                  { name: 'Pending', value: stats.grievances.pending, fill: 'url(#grievancePending)' },
                                  { name: 'In Progress', value: stats.grievances.inProgress, fill: 'url(#grievanceInProgress)' },
                                  { name: 'Resolved', value: stats.grievances.resolved, fill: 'url(#grievanceResolved)' }
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={90}
                                innerRadius={50}
                                dataKey="value"
                                paddingAngle={2}
                              >
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                iconType="circle"
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Grievance Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={[
                              { name: 'Total', value: stats.grievances.total },
                              { name: 'Pending', value: stats.grievances.pending },
                              { name: 'In Progress', value: stats.grievances.inProgress },
                              { name: 'Resolved', value: stats.grievances.resolved }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Appointment Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Appointment Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <defs>
                                <linearGradient id="appointmentPending" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FFBB28" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#FFBB28" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="appointmentConfirmed" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="appointmentCompleted" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0.7}/>
                                </linearGradient>
                              </defs>
                              <Pie
                                data={[
                                  { name: 'Pending', value: stats.appointments.pending, fill: 'url(#appointmentPending)' },
                                  { name: 'Confirmed', value: stats.appointments.confirmed, fill: 'url(#appointmentConfirmed)' },
                                  { name: 'Completed', value: stats.appointments.completed, fill: 'url(#appointmentCompleted)' }
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={90}
                                innerRadius={50}
                                dataKey="value"
                                paddingAngle={2}
                              >
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                iconType="circle"
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Appointment Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={[
                              { name: 'Total', value: stats.appointments.total },
                              { name: 'Pending', value: stats.appointments.pending },
                              { name: 'Confirmed', value: stats.appointments.confirmed },
                              { name: 'Completed', value: stats.appointments.completed }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#00C49F" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>


                    {/* Additional Analytics Charts */}
                    {/* Priority chart commented out
                    {stats.grievances.byPriority && stats.grievances.byPriority.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Grievances by Priority</CardTitle>
                            <CardDescription>Distribution of grievances by priority level</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart 
                                data={stats.grievances.byPriority} 
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="priority" width={80} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {stats.appointments.byDepartment && stats.appointments.byDepartment.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Appointments by Department</CardTitle>
                              <CardDescription>Distribution of appointments across departments</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={stats.appointments.byDepartment.map((dept: any) => ({
                                  ...dept,
                                  departmentName: dept.departmentName.replace(/\s+Department$/i, '').trim()
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="departmentName" angle={-45} textAnchor="end" height={100} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#00C49F" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                    */}
                    
                    {/* Show only Appointments by Department chart */}
                    {stats.appointments.byDepartment && stats.appointments.byDepartment.length > 0 && (
                      <div className="grid grid-cols-1 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Appointments by Department</CardTitle>
                            <CardDescription>Distribution of appointments across departments</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={stats.appointments.byDepartment.map((dept: any) => ({
                                ...dept,
                                departmentName: dept.departmentName ? dept.departmentName.replace(/\s+Department$/i, '').trim() : 'Unknown'
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="departmentName" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#00C49F" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Time Series Charts */}
                    {stats.grievances.daily && stats.grievances.daily.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Grievance Trends (Last 7 Days)</CardTitle>
                            <CardDescription>Daily grievance creation trend</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={280}>
                              <AreaChart data={stats.grievances.daily}>
                                <defs>
                                  <linearGradient id="colorGrievances" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorGrievances)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Appointment Trends (Last 7 Days)</CardTitle>
                            <CardDescription>Daily appointment creation trend</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={280}>
                              <AreaChart data={stats.appointments.daily}>
                                <defs>
                                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#00C49F" fillOpacity={1} fill="url(#colorAppointments)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Monthly Trends */}
                    {(stats.grievances.monthly || stats.appointments.monthly) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {stats.grievances.monthly && stats.grievances.monthly.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Grievance Trends (Last 6 Months)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={stats.grievances.monthly}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="Total" />
                                  <Line type="monotone" dataKey="resolved" stroke="#00C49F" name="Resolved" />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}

                        {stats.appointments.monthly && stats.appointments.monthly.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Appointment Trends (Last 6 Months)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={stats.appointments.monthly}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="count" stroke="#00C49F" name="Total" />
                                  <Line type="monotone" dataKey="completed" stroke="#0088FE" name="Completed" />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Hourly Distribution */}
                    {hourlyData && (hourlyData.grievances?.length > 0 || hourlyData.appointments?.length > 0) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {hourlyData.grievances && hourlyData.grievances.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Grievance Distribution by Hour</CardTitle>
                              <CardDescription>Peak hours for grievance submissions (Last 7 Days)</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={hourlyData.grievances}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -2 }} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}

                        {hourlyData.appointments && hourlyData.appointments.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Appointment Distribution by Hour</CardTitle>
                              <CardDescription>Peak hours for appointment bookings (Last 7 Days)</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={hourlyData.appointments}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -2 }} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#00C49F" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Performance Metrics */}
                    {performanceData && (
                      <div className="grid">
                        {/* {performanceData.topDepartments && performanceData.topDepartments.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Top Performing Departments</CardTitle>
                              <CardDescription>Departments with highest resolution rates</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart 
                                  data={performanceData.topDepartments.map((dept: any) => ({
                                    ...dept,
                                    departmentName: dept.departmentName.replace(/\s+Department$/i, '').trim()
                                  }))}
                                  layout="vertical"
                                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis type="category" dataKey="departmentName" width={90} />
                                  <Tooltip />
                                  <Legend 
                                    verticalAlign="top" 
                                    align="right"
                                    wrapperStyle={{ paddingBottom: '10px' }}
                                  />
                                  <Bar dataKey="total" fill="#8884d8" name="Total" />
                                  <Bar dataKey="resolved" fill="#00C49F" name="Resolved" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )} */}

                        {performanceData.topOperators && performanceData.topOperators.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Top Performing Operators</CardTitle>
                              <CardDescription>Operators with most resolved grievances</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={performanceData.topOperators}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="userName" angle={-45} textAnchor="end" height={100} />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="resolved" fill="#0088FE" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Category Distribution */}
                    {categoryData && categoryData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Grievance Distribution by Category</CardTitle>
                          <CardDescription>Breakdown of grievances by category</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryData.map((item: any) => ({
                              ...item,
                              category: item.category ? item.category.replace(/\s+Department$/i, '').trim() : 'Unknown'
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="category" 
                                angle={-45} 
                                textAnchor="end" 
                                height={120}
                                interval={0}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend 
                                verticalAlign="top" 
                                height={36}
                                wrapperStyle={{ paddingBottom: '10px' }}
                              />
                              <Bar dataKey="count" fill="#8884d8" name="Total" />
                              <Bar dataKey="resolved" fill="#00C49F" name="Resolved" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-blue-700 bg-clip-text text-transparent flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Grievance Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                              <span className="text-slate-700 font-medium">Total Grievances:</span>
                              <span className="font-bold text-2xl text-slate-800">{stats.grievances.total}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                                <span className="text-xs font-semibold text-yellow-700 mb-1">Pending:</span>
                                <span className="font-bold text-xl text-yellow-800">{stats.grievances.pending}</span>
                              </div>
                              
                              <div className="flex flex-col p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                <span className="text-xs font-semibold text-blue-700 mb-1">In Progress:</span>
                                <span className="font-bold text-xl text-blue-800">{stats.grievances.inProgress}</span>
                              </div>
                              
                              <div className="flex flex-col p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <span className="text-xs font-semibold text-green-700 mb-1">Resolved:</span>
                                <span className="font-bold text-xl text-green-800">{stats.grievances.resolved}</span>
                              </div>
                              
                              {stats.grievances.closed !== undefined && (
                                <div className="flex flex-col p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                                  <span className="text-xs font-semibold text-gray-700 mb-1">Closed:</span>
                                  <span className="font-bold text-xl text-gray-800">{stats.grievances.closed}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                                <span className="text-sm text-slate-600 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Last 30 Days:
                                </span>
                                <span className="font-bold text-slate-800">{stats.grievances.last30Days}</span>
                              </div>
                              {stats.grievances.avgResolutionDays !== undefined && (
                                <div className="flex justify-between items-center p-2 bg-white rounded-md">
                                  <span className="text-sm text-slate-600 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Avg Resolution:
                                  </span>
                                  <span className="font-bold text-slate-800">{stats.grievances.avgResolutionDays} days</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-slate-50 to-purple-50 border-slate-200 shadow-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-purple-700 bg-clip-text text-transparent flex items-center gap-2">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Appointment Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                              <span className="text-slate-700 font-medium">Total Appointments:</span>
                              <span className="font-bold text-2xl text-slate-800">{stats.appointments.total}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                                <span className="text-xs font-semibold text-yellow-700 mb-1">Pending:</span>
                                <span className="font-bold text-xl text-yellow-800">{stats.appointments.pending}</span>
                              </div>
                              
                              <div className="flex flex-col p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                <span className="text-xs font-semibold text-blue-700 mb-1">Confirmed:</span>
                                <span className="font-bold text-xl text-blue-800">{stats.appointments.confirmed}</span>
                              </div>
                              
                              <div className="flex flex-col p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <span className="text-xs font-semibold text-green-700 mb-1">Completed:</span>
                                <span className="font-bold text-xl text-green-800">{stats.appointments.completed}</span>
                              </div>
                              
                              {stats.appointments.cancelled !== undefined && (
                                <div className="flex flex-col p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200">
                                  <span className="text-xs font-semibold text-red-700 mb-1">Cancelled:</span>
                                  <span className="font-bold text-xl text-red-800">{stats.appointments.cancelled}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                              <div className="flex justify-between items-center p-2 bg-white rounded-md">
                                <span className="text-sm text-slate-600 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Last 30 Days:
                                </span>
                                <span className="font-bold text-slate-800">{stats.appointments.last30Days}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No analytics data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {(isCompanyAdmin || isDepartmentAdmin) && (
          <>
            {isCompanyAdmin && (
              <CreateDepartmentDialog
                isOpen={showDepartmentDialog}
                onClose={() => {
                  setShowDepartmentDialog(false);
                  setEditingDepartment(null);
                }}
                onDepartmentCreated={() => {
                  fetchDepartments();
                  fetchDashboardData();
                  setEditingDepartment(null);
                }}
                editingDepartment={editingDepartment}
              />
            )}
            <ConfirmDialog
              isOpen={confirmDialog.isOpen}
              title={confirmDialog.title}
              message={confirmDialog.message}
              onConfirm={confirmDialog.onConfirm}
              onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              variant={confirmDialog.variant}
            />
            <CreateUserDialog
              isOpen={showUserDialog}
              onClose={() => setShowUserDialog(false)}
              onUserCreated={() => {
                fetchUsers();
                fetchDashboardData();
              }}
            />
            <EditUserDialog
              isOpen={showEditUserDialog}
              onClose={() => {
                setShowEditUserDialog(false);
                setEditingUser(null);
              }}
              onUserUpdated={() => {
                fetchUsers();
                fetchDashboardData();
              }}
              user={editingUser}
            />
            <ChangePermissionsDialog
              isOpen={showChangePermissionsDialog}
              onClose={() => {
                setShowChangePermissionsDialog(false);
                setEditingUser(null);
              }}
              onPermissionsUpdated={() => {
                fetchUsers();
                fetchDashboardData();
              }}
              user={editingUser}
            />
          </>
        )}

        {/* Detail Dialogs */}
        <GrievanceDetailDialog
          isOpen={showGrievanceDetail}
          grievance={selectedGrievance}
          onClose={() => {
            setShowGrievanceDetail(false);
            setSelectedGrievance(null);
          }}
        />

        <AppointmentDetailDialog
          isOpen={showAppointmentDetail}
          appointment={selectedAppointment}
          onClose={() => {
            setShowAppointmentDetail(false);
            setSelectedAppointment(null);
          }}
        />

        {/* Assignment Dialogs */}
        {selectedGrievanceForAssignment && user?.companyId && (
          <AssignmentDialog
            isOpen={showGrievanceAssignment}
            onClose={() => {
              setShowGrievanceAssignment(false);
              setSelectedGrievanceForAssignment(null);
            }}
            onAssign={async (userId: string, departmentId?: string) => {
              await grievanceAPI.assign(selectedGrievanceForAssignment._id, userId, departmentId);
              await fetchGrievances();
              await fetchDashboardData();
            }}
            itemType="grievance"
            itemId={selectedGrievanceForAssignment._id}
            companyId={typeof user.companyId === 'object' && user.companyId !== null ? user.companyId._id : user.companyId || ''}
            currentAssignee={selectedGrievanceForAssignment.assignedTo}
            currentDepartmentId={
              selectedGrievanceForAssignment.departmentId && typeof selectedGrievanceForAssignment.departmentId === 'object' 
                ? selectedGrievanceForAssignment.departmentId._id 
                : selectedGrievanceForAssignment.departmentId
            }
            userRole={user.role}
            userDepartmentId={typeof user.departmentId === 'object' && user.departmentId !== null ? user.departmentId._id : user.departmentId}
          />
        )}

        {selectedAppointmentForAssignment && user?.companyId && (
          <AssignmentDialog
            isOpen={showAppointmentAssignment}
            onClose={() => {
              setShowAppointmentAssignment(false);
              setSelectedAppointmentForAssignment(null);
            }}
            onAssign={async (userId: string, departmentId?: string) => {
              await appointmentAPI.assign(selectedAppointmentForAssignment._id, userId, departmentId);
              await fetchAppointments();
              await fetchDashboardData();
            }}
            itemType="appointment"
            itemId={selectedAppointmentForAssignment._id}
            companyId={typeof user.companyId === 'object' && user.companyId !== null ? user.companyId._id : user.companyId || ''}
            currentAssignee={selectedAppointmentForAssignment.assignedTo}
            currentDepartmentId={
              selectedAppointmentForAssignment.departmentId && typeof selectedAppointmentForAssignment.departmentId === 'object' 
                ? selectedAppointmentForAssignment.departmentId._id 
                : selectedAppointmentForAssignment.departmentId
            }
            userRole={user.role}
            userDepartmentId={typeof user.departmentId === 'object' && user.departmentId !== null ? user.departmentId._id : user.departmentId}
          />
        )}

        {/* Metric Info Dialog */}
        <MetricInfoDialog
          isOpen={showMetricDialog}
          onClose={() => setShowMetricDialog(false)}
          metric={selectedMetric}
        />
      </main>
    </div>
  );
}
