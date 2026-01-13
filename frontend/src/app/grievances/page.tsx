'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { grievanceAPI, Grievance } from '../../lib/api/grievance';
import { FileText, MapPin, Phone, Calendar, Filter, Search, Eye, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import CitizenDetailsModal from '../../components/grievance/CitizenDetailsModal';
import AssignmentDialog from '../../components/assignment/AssignmentDialog';

export default function GrievancesPage() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [grievanceToAssign, setGrievanceToAssign] = useState<Grievance | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });

  // Extract companyId from user
  const companyId = typeof user?.companyId === 'object' ? (user.companyId as any)._id : user?.companyId || '';

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      const response = await grievanceAPI.getAll();
      if (response.success) {
        setGrievances(response.data.grievances);
      }
    } catch (error) {
      toast.error('Failed to load grievances');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = (grievance: Grievance) => {
    setGrievanceToAssign(grievance);
    setAssignDialogOpen(true);
  };

  const handleAssign = async (userId: string) => {
    if (!grievanceToAssign) return;
    await grievanceAPI.assign(grievanceToAssign._id, userId);
    await fetchGrievances();
  };

  const handleViewDetails = (grievance: Grievance) => {
    setSelectedGrievance(grievance);
    setModalOpen(true);
  };

  const filteredGrievances = grievances.filter(g => {
    if (filters.status !== 'all' && g.status !== filters.status) return false;
    if (filters.category !== 'all' && g.category !== filters.category) return false;
    if (filters.search && !g.citizenName?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !g.grievanceId?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-blue-600" />
              Grievance Management
            </h1>
            <p className="text-gray-600 mt-2">View and manage citizen grievances</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Grievances</p>
            <p className="text-3xl font-bold text-blue-600">{grievances.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="water">Water Supply</option>
            <option value="electricity">Electricity</option>
            <option value="road">Road</option>
            <option value="sanitation">Sanitation</option>
            <option value="others">Others</option>
          </select>

          <button
            onClick={() => setFilters({ status: 'all', category: 'all', search: '' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Grievances Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading grievances...</p>
          </div>
        ) : filteredGrievances.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No grievances found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Application No</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Citizen Information</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Department & Category</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Issue Description</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Raised On</th>
                  <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGrievances.map((grievance) => (
                  <tr key={grievance._id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-blue-700">{grievance.grievanceId}</span>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase">Ref ID: {grievance._id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleViewDetails(grievance)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-left hover:underline"
                        >
                          {grievance.citizenName}
                        </button>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {grievance.citizenPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {typeof grievance.departmentId === 'object' ? (grievance.departmentId as any).name : 'General Department'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100 w-fit">
                          {grievance.category || 'General'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-xs leading-relaxed">
                        {grievance.description}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`h-2 w-2 rounded-full mr-2 ${
                          grievance.priority === 'HIGH' || grievance.priority === 'URGENT' ? 'bg-red-500' :
                          grievance.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className={`text-sm font-bold ${getPriorityColor(grievance.priority || 'MEDIUM')}`}>
                          {grievance.priority || 'MEDIUM'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {grievance.assignedTo ? (
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <UserPlus className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                            <span className="text-sm font-semibold text-gray-900">
                              {typeof grievance.assignedTo === 'object' 
                                ? `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}`
                                : grievance.assignedTo}
                            </span>
                          </div>
                          {grievance.assignedAt && (
                            <span className="text-[10px] text-gray-400 mt-1">
                              Assigned on: {new Date(grievance.assignedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          Pending Assignment
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusColor(grievance.status)}`}>
                        {grievance.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          {new Date(grievance.createdAt).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {new Date(grievance.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {user?.role === 'COMPANY_ADMIN' && (
                          <button
                            onClick={() => handleAssignClick(grievance)}
                            title="Assign Officer"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(grievance)}
                          title="View Full Details"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
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
          setSelectedGrievance(null);
        }}
        grievance={selectedGrievance}
      />

      {/* Assignment Dialog */}
      <AssignmentDialog
        isOpen={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false);
          setGrievanceToAssign(null);
        }}
        onAssign={handleAssign}
        itemType="grievance"
        itemId={grievanceToAssign?._id || ''}
        companyId={companyId}
        currentAssignee={grievanceToAssign?.assignedTo}
      />
    </div>
  );
}
