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
import { ProtectedButton } from '@/components/ui/ProtectedButton';
import { Permission } from '@/lib/permissions';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface DashboardStats {
  grievances: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    last7Days: number;
    last30Days: number;
    resolutionRate: number;
    daily: Array<{ date: string; count: number }>;
  };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    last7Days: number;
    last30Days: number;
    completionRate: number;
    daily: Array<{ date: string; count: number }>;
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
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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
  }, [mounted, user]);

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
        setUsers(response.data.users);
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
                {isCompanyAdmin && 'Company Admin Dashboard'}
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
            <ProtectedButton
              permission={Permission.READ_GRIEVANCE}
              asChild
              fallback={null}
            >
              <TabsTrigger value="grievances">Grievances</TabsTrigger>
            </ProtectedButton>
            <ProtectedButton
              permission={Permission.READ_APPOINTMENT}
              asChild
              fallback={null}
            >
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
            </ProtectedButton>
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
            {/* Company Info (for Company Admin) */}
            {isCompanyAdmin && company && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company Name</p>
                      <p className="text-lg font-semibold">{company.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company Type</p>
                      <p className="text-lg font-semibold">{company.companyType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Email</p>
                      <p className="text-lg font-semibold">{company.contactEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Phone</p>
                      <p className="text-lg font-semibold">{company.contactPhone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats && (
                <>
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Total Grievances</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.grievances.total}</p>
                      <p className="text-blue-100 text-sm mt-2">
                        {stats.grievances.pending} pending
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Resolved</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.grievances.resolved}</p>
                      <p className="text-green-100 text-sm mt-2">
                        {stats.grievances.inProgress} in progress
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">{stats.appointments.total}</p>
                      <p className="text-purple-100 text-sm mt-2">
                        {stats.appointments.confirmed} confirmed
                      </p>
                    </CardContent>
                  </Card>

                  {(isCompanyAdmin || isDepartmentAdmin) && (
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Departments</CardTitle>
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Department Management</CardTitle>
                      <CardDescription>
                        {isCompanyAdmin ? 'Manage all departments in your company' : 'View your department'}
                      </CardDescription>
                    </div>
                    {isCompanyAdmin && (
                      <ProtectedButton
                        permission={Permission.CREATE_DEPARTMENT}
                        onClick={() => setShowDepartmentDialog(true)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Department
                      </ProtectedButton>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {departments.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No departments found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {departments.map((dept) => (
                        <div key={dept._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">{dept.name}</h4>
                              <p className="text-sm text-gray-500">{dept.departmentId}</p>
                              {dept.description && (
                                <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                    <ProtectedButton
                      permission={Permission.CREATE_USER}
                      onClick={() => setShowUserDialog(true)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add User
                    </ProtectedButton>
                  </div>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No users found</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((u) => (
                            <tr key={u._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                    {u.firstName[0]}{u.lastName[0]}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {u.firstName} {u.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">{u.userId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                  <div className="space-y-4">
                    {grievances.map((grievance) => (
                      <div key={grievance._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{grievance.citizenName}</h4>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {grievance.grievanceId}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                grievance.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                grievance.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {grievance.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{grievance.citizenPhone}</p>
                            <p className="text-gray-700">{grievance.description}</p>
                            {grievance.category && (
                              <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                {grievance.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{appointment.citizenName}</h4>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {appointment.appointmentId}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Purpose:</span> {appointment.purpose}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Date:</span> {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                            </p>
                            <p className="text-sm text-gray-600">{appointment.citizenPhone}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                  </div>
                ) : stats ? (
                  <div className="space-y-8">
                    {/* Grievance Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Grievance Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Pending', value: stats.grievances.pending },
                                  { name: 'In Progress', value: stats.grievances.inProgress },
                                  { name: 'Resolved', value: stats.grievances.resolved }
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  { name: 'Pending', value: stats.grievances.pending },
                                  { name: 'In Progress', value: stats.grievances.inProgress },
                                  { name: 'Resolved', value: stats.grievances.resolved }
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Grievance Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
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
                          <CardTitle className="text-lg">Appointment Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Pending', value: stats.appointments.pending },
                                  { name: 'Confirmed', value: stats.appointments.confirmed },
                                  { name: 'Completed', value: stats.appointments.completed }
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  { name: 'Pending', value: stats.appointments.pending },
                                  { name: 'Confirmed', value: stats.appointments.confirmed },
                                  { name: 'Completed', value: stats.appointments.completed }
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Appointment Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
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

                    {/* Time Series Charts */}
                    {stats.grievances.daily && stats.grievances.daily.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Grievance Trends (Last 7 Days)</CardTitle>
                            <CardDescription>Daily grievance creation trend</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
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
                            <CardTitle className="text-lg">Appointment Trends (Last 7 Days)</CardTitle>
                            <CardDescription>Daily appointment creation trend</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
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

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-green-800">Resolution Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-700">{stats.grievances.resolutionRate}%</div>
                          <p className="text-xs text-green-600 mt-1">
                            {stats.grievances.resolved} of {stats.grievances.total} resolved
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-blue-800">Completion Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-700">{stats.appointments.completionRate}%</div>
                          <p className="text-xs text-blue-600 mt-1">
                            {stats.appointments.completed} of {stats.appointments.total} completed
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-purple-800">Last 7 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-700">{stats.grievances.last7Days}</div>
                          <p className="text-xs text-purple-600 mt-1">New grievances</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-orange-800">Last 7 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-orange-700">{stats.appointments.last7Days}</div>
                          <p className="text-xs text-orange-600 mt-1">New appointments</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Grievance Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Grievances:</span>
                              <span className="font-bold text-lg">{stats.grievances.total}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-yellow-600">Pending:</span>
                              <span className="font-semibold">{stats.grievances.pending}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600">In Progress:</span>
                              <span className="font-semibold">{stats.grievances.inProgress}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-green-600">Resolved:</span>
                              <span className="font-semibold">{stats.grievances.resolved}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Last 30 Days:</span>
                                <span className="font-semibold">{stats.grievances.last30Days}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Appointment Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total Appointments:</span>
                              <span className="font-bold text-lg">{stats.appointments.total}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-yellow-600">Pending:</span>
                              <span className="font-semibold">{stats.appointments.pending}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600">Confirmed:</span>
                              <span className="font-semibold">{stats.appointments.confirmed}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-green-600">Completed:</span>
                              <span className="font-semibold">{stats.appointments.completed}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Last 30 Days:</span>
                                <span className="font-semibold">{stats.appointments.last30Days}</span>
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
        {isCompanyAdmin && (
          <>
            <CreateDepartmentDialog
              isOpen={showDepartmentDialog}
              onClose={() => setShowDepartmentDialog(false)}
              onDepartmentCreated={() => {
                fetchDepartments();
                fetchDashboardData();
              }}
            />
            <CreateUserDialog
              isOpen={showUserDialog}
              onClose={() => setShowUserDialog(false)}
              onUserCreated={() => {
                fetchUsers();
                fetchDashboardData();
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
