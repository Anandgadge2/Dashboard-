'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { departmentAPI, Department } from '@/lib/api/department';
import { companyAPI, Company } from '@/lib/api/company';
import { userAPI, User } from '@/lib/api/user';
import { apiClient } from '@/lib/api/client';
import { grievanceAPI, Grievance } from '@/lib/api/grievance';
import { appointmentAPI, Appointment } from '@/lib/api/appointment';
import GrievanceDetailDialog from '@/components/grievance/GrievanceDetailDialog';
import AppointmentDetailDialog from '@/components/appointment/AppointmentDetailDialog';
import toast from 'react-hot-toast';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DepartmentDetail() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const departmentId = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGrievances: 0,
    totalAppointments: 0,
    activeUsers: 0,
    pendingGrievances: 0,
    resolvedGrievances: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showGrievanceDetail, setShowGrievanceDetail] = useState(false);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [departmentId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch department
      const deptRes = await departmentAPI.getById(departmentId);
      if (deptRes.success) {
        setDepartment(deptRes.data.department);
        const deptCompanyId = typeof deptRes.data.department.companyId === 'object' 
          ? deptRes.data.department.companyId._id 
          : deptRes.data.department.companyId;
        
        // Fetch company
        if (deptCompanyId && user?.role === 'COMPANY_ADMIN') {
          const companyRes = await companyAPI.getMyCompany();
          if (companyRes.success) {
            setCompany(companyRes.data.company);
          }
        }
      }

      // Fetch users for this department
      const usersRes = await userAPI.getAll({ departmentId });
      if (usersRes.success) {
        setUsers(usersRes.data.users);
      }

      // Fetch grievances
      const grievancesRes = await grievanceAPI.getAll({ departmentId, limit: 100 });
      if (grievancesRes.success) {
        setGrievances(grievancesRes.data.grievances);
      }

      // Fetch appointments
      const appointmentsRes = await appointmentAPI.getAll({ departmentId, limit: 100 });
      if (appointmentsRes.success) {
        setAppointments(appointmentsRes.data.appointments);
      }

      // Calculate stats
      const statsRes = await apiClient.get(`/analytics/dashboard?departmentId=${departmentId}`);
      if (statsRes.success) {
        setStats({
          totalUsers: usersRes.success ? usersRes.data.users.length : 0,
          totalGrievances: statsRes.data.grievances?.total || 0,
          totalAppointments: statsRes.data.appointments?.total || 0,
          activeUsers: usersRes.success ? usersRes.data.users.filter((u: User) => u.isActive).length : 0,
          pendingGrievances: statsRes.data.grievances?.pending || 0,
          resolvedGrievances: statsRes.data.grievances?.resolved || 0
        });
      }
    } catch (error: any) {
      toast.error('Failed to load department data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Department not found</h2>
          <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const grievanceStatusData = [
    { name: 'Pending', value: stats.pendingGrievances },
    { name: 'Resolved', value: stats.resolvedGrievances },
    { name: 'In Progress', value: stats.totalGrievances - stats.pendingGrievances - stats.resolvedGrievances }
  ].filter(item => item.value > 0);

  const userRoleData = users.reduce((acc: any[], user) => {
    const existing = acc.find(item => item.name === user.role);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: user.role, value: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-2">
                ← Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
              <p className="text-sm text-gray-600">
                Department Dashboard - {department.departmentId}
                {company && ` • ${company.name}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="grievances">Grievances</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card 
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('users')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    <span>Total Users</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalUsers}</p>
                  <p className="text-blue-100 text-sm mt-2">{stats.activeUsers} active</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('grievances')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    <span>Grievances</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalGrievances}</p>
                  <p className="text-purple-100 text-sm mt-2">{stats.pendingGrievances} pending</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('appointments')}
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
                  <p className="text-4xl font-bold">{stats.totalAppointments}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Department Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department ID</p>
                    <p className="text-lg font-semibold">{department.departmentId}</p>
                  </div>
                  {company && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company</p>
                      <p className="text-lg font-semibold">{company.name}</p>
                    </div>
                  )}
                  {department.contactPerson && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Person</p>
                      <p className="text-lg font-semibold">{department.contactPerson}</p>
                    </div>
                  )}
                  {department.contactEmail && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Email</p>
                      <p className="text-lg font-semibold">{department.contactEmail}</p>
                    </div>
                  )}
                </div>
                {department.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-gray-700">{department.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No users found</p>
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
                              <div className="text-sm font-medium text-gray-900">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{u.userId}</div>
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

          <TabsContent value="grievances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grievances ({grievances.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {grievances.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No grievances found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr className="whitespace-nowrap">
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Application No</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Citizen Details</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Raised On</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {grievances.map((g) => (
                          <tr key={g._id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-4">
                              <span className="font-bold text-sm text-blue-700">{g.grievanceId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <button
                                  onClick={async () => {
                                    const response = await grievanceAPI.getById(g._id);
                                    if (response.success) {
                                      setSelectedGrievance(response.data.grievance);
                                      setShowGrievanceDetail(true);
                                    }
                                  }}
                                  className="text-gray-900 font-bold text-sm text-left hover:text-blue-600 hover:underline"
                                >
                                  {g.citizenName}
                                </button>
                                <span className="text-xs text-gray-500">{g.citizenPhone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic">
                                {g.category || 'General'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={g.status}
                                onChange={async (e) => {
                                  try {
                                    const response = await grievanceAPI.updateStatus(g._id, e.target.value);
                                    if (response.success) {
                                      toast.success('Status updated successfully');
                                      fetchData();
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
                                <span className="font-medium text-gray-800">{new Date(g.createdAt).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const response = await grievanceAPI.getById(g._id);
                                    if (response.success) {
                                      setSelectedGrievance(response.data.grievance);
                                      setShowGrievanceDetail(true);
                                    }
                                  }}
                                  title="View Details"
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments ({appointments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No appointments found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr className="whitespace-nowrap">
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Appointment ID</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Citizen Details</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled At</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {appointments.map((a) => (
                          <tr key={a._id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-4 text-sm">
                              <span className="font-bold text-purple-700">{a.appointmentId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <button
                                  onClick={async () => {
                                    const response = await appointmentAPI.getById(a._id);
                                    if (response.success) {
                                      setSelectedAppointment(response.data.appointment);
                                      setShowAppointmentDetail(true);
                                    }
                                  }}
                                  className="text-gray-900 font-bold text-sm text-left hover:text-purple-600 hover:underline"
                                >
                                  {a.citizenName}
                                </button>
                                <span className="text-xs text-gray-500">{a.citizenPhone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs text-gray-600 line-clamp-1 italic">{a.purpose}</span>
                            </td>
                            <td className="px-4 py-4 text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{new Date(a.appointmentDate).toLocaleDateString()}</span>
                                <span className="text-[10px] text-amber-600 font-bold uppercase">{a.appointmentTime}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={a.status}
                                onChange={async (e) => {
                                  try {
                                    const response = await appointmentAPI.updateStatus(a._id, e.target.value);
                                    if (response.success) {
                                      toast.success('Status updated successfully');
                                      fetchData();
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
                              <div className="flex items-center justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const response = await appointmentAPI.getById(a._id);
                                    if (response.success) {
                                      setSelectedAppointment(response.data.appointment);
                                      setShowAppointmentDetail(true);
                                    }
                                  }}
                                  title="View Details"
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card 
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('grievances')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center justify-between">
                    <span>Total Grievances</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalGrievances}</p>
                  <p className="text-blue-100 text-sm mt-1">{stats.pendingGrievances} pending</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('grievances')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center justify-between">
                    <span>Resolved</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.resolvedGrievances}</p>
                  <p className="text-green-100 text-sm mt-1">
                    {stats.totalGrievances > 0 
                      ? Math.round((stats.resolvedGrievances / stats.totalGrievances) * 100) 
                      : 0}% rate
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('appointments')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center justify-between">
                    <span>Total Appointments</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalAppointments}</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('users')}
              >
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center justify-between">
                    <span>Active Users</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.activeUsers}</p>
                  <p className="text-orange-100 text-sm mt-1">of {stats.totalUsers} total</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grievance Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={grievanceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {grievanceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userRoleData}>
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

            {/* Grievance and Appointment Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grievances</CardTitle>
                </CardHeader>
                <CardContent>
                  {grievances.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No grievances found</p>
                  ) : (
                    <div className="space-y-3">
                      {grievances.slice(0, 5).map((g) => (
                        <div key={g._id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{g.citizenName}</h4>
                              <p className="text-xs text-gray-500 truncate">{g.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              g.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                              g.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {g.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No appointments found</p>
                  ) : (
                    <div className="space-y-3">
                      {appointments.slice(0, 5).map((a) => (
                        <div key={a._id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{a.citizenName}</h4>
                              <p className="text-xs text-gray-500">{a.purpose}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(a.appointmentDate).toLocaleDateString()} at {a.appointmentTime}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              a.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

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
    </div>
  );
}
