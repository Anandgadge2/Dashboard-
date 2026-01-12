'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { companyAPI, Company } from '@/lib/api/company';
import { departmentAPI, Department } from '@/lib/api/department';
import { userAPI, User } from '@/lib/api/user';
import { apiClient } from '@/lib/api/client';
import { grievanceAPI, Grievance } from '@/lib/api/grievance';
import { appointmentAPI, Appointment } from '@/lib/api/appointment';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function CompanyDrillDown() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDepartments: 0,
    totalGrievances: 0,
    totalAppointments: 0,
    activeUsers: 0,
    pendingGrievances: 0,
    resolvedGrievances: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/superadmin/dashboard');
      return;
    }
    fetchData();
  }, [companyId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch company
      const companyRes = await companyAPI.getById(companyId);
      if (companyRes.success) {
        setCompany(companyRes.data.company);
      }

      // Fetch departments for this company
      const deptRes = await departmentAPI.getAll({ companyId });
      if (deptRes.success) {
        setDepartments(deptRes.data.departments);
      }

      // Fetch users for this company
      const usersRes = await userAPI.getAll({ companyId });
      if (usersRes.success) {
        setUsers(usersRes.data.users);
      }

      // Fetch grievances
      const grievancesRes = await grievanceAPI.getAll({ limit: 100 });
      if (grievancesRes.success) {
        const companyGrievances = grievancesRes.data.grievances.filter((g: Grievance) => {
          const gCompanyId = typeof g.companyId === 'object' ? g.companyId._id : g.companyId;
          return gCompanyId === companyId;
        });
        setGrievances(companyGrievances);
      }

      // Fetch appointments
      const appointmentsRes = await appointmentAPI.getAll({ limit: 100 });
      if (appointmentsRes.success) {
        const companyAppointments = appointmentsRes.data.appointments.filter((a: Appointment) => {
          const aCompanyId = typeof a.companyId === 'object' ? a.companyId._id : a.companyId;
          return aCompanyId === companyId;
        });
        setAppointments(companyAppointments);
      }

      // Calculate stats
      const statsRes = await apiClient.get(`/analytics/dashboard?companyId=${companyId}`);
      if (statsRes.success) {
        setStats({
          totalUsers: usersRes.success ? usersRes.data.users.length : 0,
          totalDepartments: deptRes.success ? deptRes.data.departments.length : 0,
          totalGrievances: statsRes.data.grievances?.total || 0,
          totalAppointments: statsRes.data.appointments?.total || 0,
          activeUsers: usersRes.success ? usersRes.data.users.filter((u: User) => u.isActive).length : 0,
          pendingGrievances: statsRes.data.grievances?.pending || 0,
          resolvedGrievances: statsRes.data.grievances?.resolved || 0
        });
      }
    } catch (error: any) {
      toast.error('Failed to load company data');
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

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <Button onClick={() => router.push('/superadmin/dashboard')}>Back to Dashboard</Button>
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

  const departmentUserData = departments.map(dept => ({
    name: dept.name,
    users: users.filter(u => {
      const uDeptId = typeof u.departmentId === 'object' ? u.departmentId._id : u.departmentId;
      return uDeptId === dept._id;
    }).length
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => router.push('/superadmin/dashboard')} className="mb-2">
                ← Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-sm text-gray-600">Company Dashboard - {company.companyId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="grievances">Grievances</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalUsers}</p>
                  <p className="text-blue-100 text-sm mt-2">{stats.activeUsers} active</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalDepartments}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Grievances</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalGrievances}</p>
                  <p className="text-purple-100 text-sm mt-2">{stats.pendingGrievances} pending</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{stats.totalAppointments}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Departments ({departments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No departments found</p>
                ) : (
                  <div className="space-y-4">
                    {departments.map((dept) => (
                      <div 
                        key={dept._id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          const companyId = typeof dept.companyId === 'object' ? dept.companyId._id : dept.companyId;
                          router.push(`/superadmin/department/${dept._id}?companyId=${companyId}`);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg text-blue-600 hover:underline">{dept.name}</h4>
                            <p className="text-sm text-gray-500">{dept.departmentId}</p>
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
                  <div className="space-y-4">
                    {grievances.slice(0, 20).map((g) => (
                      <div key={g._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{g.citizenName}</h4>
                            <p className="text-sm text-gray-500">{g.citizenPhone}</p>
                            <p className="text-sm text-gray-700 mt-1">{g.description}</p>
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
                  <div className="space-y-4">
                    {appointments.slice(0, 20).map((a) => (
                      <div key={a._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{a.citizenName}</h4>
                            <p className="text-sm text-gray-500">{a.purpose}</p>
                            <p className="text-sm text-gray-500">
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
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
                  <CardTitle>Users per Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentUserData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
