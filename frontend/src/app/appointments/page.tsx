'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentAPI, Appointment } from '@/lib/api/appointment';
import { Calendar, MapPin, Phone, Filter, Search, Eye, Clock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import CitizenDetailsModal from '@/components/grievance/CitizenDetailsModal';
import AssignmentDialog from '@/components/assignment/AssignmentDialog';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [appointmentToAssign, setAppointmentToAssign] = useState<Appointment | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // Extract companyId from user
  const companyId = typeof user?.companyId === 'object' ? (user.companyId as any)._id : user?.companyId || '';

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getAll();
      if (response.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = (appointment: Appointment) => {
    setAppointmentToAssign(appointment);
    setAssignDialogOpen(true);
  };

  const handleAssign = async (userId: string) => {
    if (!appointmentToAssign) return;
    await appointmentAPI.assign(appointmentToAssign._id, userId);
    await fetchAppointments();
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const filteredAppointments = appointments.filter(a => {
    if (filters.status !== 'all' && a.status !== filters.status) return false;
    if (filters.search && !a.citizenName?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !a.appointmentId?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
      case 'NO_SHOW': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-purple-600" />
              Appointment Management
            </h1>
            <p className="text-gray-600 mt-2">View and manage citizen appointments</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Appointments</p>
            <p className="text-3xl font-bold text-purple-600">{appointments.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={() => setFilters({ status: 'all', search: '' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Appointment ID</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Citizen Information</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Department & Purpose</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Scheduled For</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-purple-700">{appointment.appointmentId}</span>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase">Ref ID: {appointment._id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="text-purple-600 hover:text-purple-800 font-bold text-left hover:underline"
                        >
                          {appointment.citizenName}
                        </button>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {appointment.citizenPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {typeof appointment.departmentId === 'object' ? (appointment.departmentId as any).name : 'General Department'}
                        </span>
                        <p className="text-[11px] text-gray-600 line-clamp-1 italic">
                          {appointment.purpose}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm font-bold text-gray-900">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-[11px] font-medium text-gray-600">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                          {appointment.appointmentTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {appointment.assignedTo ? (
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <UserPlus className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              {typeof appointment.assignedTo === 'object' 
                                ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`
                                : appointment.assignedTo}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                          Pending Assignment
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-semibold">{new Date(appointment.createdAt).toLocaleDateString()}</span>
                        <span className="text-gray-400">{new Date(appointment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {user?.role === 'COMPANY_ADMIN' && (
                          <button
                            onClick={() => handleAssignClick(appointment)}
                            title="Assign Officer"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          title="View Full Details"
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Citizen Details Modal */}
      <CitizenDetailsModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        isOpen={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false);
          setAppointmentToAssign(null);
        }}
        onAssign={handleAssign}
        itemType="appointment"
        itemId={appointmentToAssign?._id || ''}
        companyId={companyId}
        currentAssignee={appointmentToAssign?.assignedTo}
      />
    </div>
  );
}
