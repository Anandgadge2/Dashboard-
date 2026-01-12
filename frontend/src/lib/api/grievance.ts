import { apiClient } from './client';

export interface Grievance {
  _id: string;
  grievanceId: string;
  companyId: string | { _id: string; name: string };
  departmentId?: string | { _id: string; name: string };
  citizenName: string;
  citizenPhone: string;
  citizenWhatsApp?: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  assignedTo?: string | { _id: string; firstName: string; lastName: string };
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrievanceData {
  companyId: string;
  departmentId?: string;
  citizenName: string;
  citizenPhone: string;
  citizenWhatsApp?: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  location?: {
    coordinates: [number, number];
    address?: string;
  };
}

export interface GrievancesResponse {
  success: boolean;
  data: {
    grievances: Grievance[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export const grievanceAPI = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    departmentId?: string;
    assignedTo?: string;
    priority?: string;
  }): Promise<GrievancesResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    if (params?.priority) queryParams.append('priority', params.priority);
    
    return apiClient.get(`/grievances?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<{ success: boolean; data: { grievance: Grievance } }> => {
    return apiClient.get(`/grievances/${id}`);
  },

  create: async (data: CreateGrievanceData): Promise<{ success: boolean; data: { grievance: Grievance } }> => {
    return apiClient.post('/grievances', data);
  },

  updateStatus: async (id: string, status: string, remarks?: string): Promise<{ success: boolean; data: { grievance: Grievance } }> => {
    return apiClient.put(`/grievances/${id}/status`, { status, remarks });
  },

  assign: async (id: string, assignedTo: string): Promise<{ success: boolean; data: { grievance: Grievance } }> => {
    return apiClient.put(`/grievances/${id}/assign`, { assignedTo });
  },

  update: async (id: string, data: Partial<CreateGrievanceData>): Promise<{ success: boolean; data: { grievance: Grievance } }> => {
    return apiClient.put(`/grievances/${id}`, data);
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/grievances/${id}`);
  }
};
