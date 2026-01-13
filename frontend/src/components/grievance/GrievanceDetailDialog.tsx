'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grievance } from '@/lib/api/grievance';
import { format } from 'date-fns';
import { 
  Calendar, 
  User, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock,
  MessageSquare,
  Building
} from 'lucide-react';


interface GrievanceDetailDialogProps {
  isOpen: boolean;
  grievance: Grievance | null;
  onClose: () => void;
}

const GrievanceDetailDialog: React.FC<GrievanceDetailDialogProps> = ({ isOpen, grievance, onClose }) => {
  if (!isOpen || !grievance) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grievance Details</CardTitle>
              <CardDescription>Reference: {grievance.grievanceId}</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Citizen Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Citizen Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-base font-semibold text-gray-900">{grievance.citizenName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-base text-gray-900">{grievance.citizenPhone}</p>
              </div>
              {grievance.citizenWhatsApp && (
                <div>
                  <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                  <p className="text-base text-gray-900">{grievance.citizenWhatsApp}</p>
                </div>
              )}
            </div>
          </div>

          {/* Grievance Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Grievance Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{grievance.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {grievance.category && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-base text-gray-900">{grievance.category}</p>
                  </div>
                )}
                {grievance.priority && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Priority</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(grievance.priority)}`}>
                      {grievance.priority}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(grievance.status)}`}>
                    {grievance.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          {(grievance as any).location && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Location Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {(grievance as any).location.address && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-base text-gray-900">{(grievance as any).location.address}</p>
                  </div>
                )}
                {(grievance as any).location.coordinates && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coordinates</p>
                    <p className="text-base text-gray-900">
                      Lat: {(grievance as any).location.coordinates[1]?.toFixed(6)}, 
                      Lng: {(grievance as any).location.coordinates[0]?.toFixed(6)}
                    </p>
                    {(grievance as any).location.coordinates && (
                      <a
                        href={`https://www.google.com/maps?q=${(grievance as any).location.coordinates[1]},${(grievance as any).location.coordinates[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 inline-block"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media/Photos */}
          {(grievance as any).media && (grievance as any).media.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Uploaded Media</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(grievance as any).media.map((media: any, index: number) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    {media.type === 'image' || media.url?.includes('image') ? (
                      <img
                        src={media.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aesthetic Timeline */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-800">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Service Timeline
            </h3>
            
            <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {/* Creation Entry */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center z-10">
                  <Calendar className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Grievance Registered</p>
                    <span className="text-xs text-gray-500 font-medium">
                      {format(new Date(grievance.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Grievance successfully submitted via WhatsApp Chatbot.</p>
                </div>
              </div>

              {/* Dynamic Timeline Entries */}
              {grievance.timeline && grievance.timeline.length > 0 ? (
                grievance.timeline.map((event, index) => {
                  if (event.action === 'CREATED') return null; // Already handled above

                  let icon = <RefreshCw className="w-3 h-3 text-blue-600" />;
                  let bgColor = 'bg-blue-100';
                  let title = 'Activity Logged';
                  let description = '';

                  switch (event.action) {
                    case 'ASSIGNED':
                      icon = <User className="w-3 h-3 text-orange-600" />;
                      bgColor = 'bg-orange-100';
                      title = 'Officer Assigned';
                      description = `Assigned to ${event.details?.toUserName || 'an officer'}.`;
                      break;
                    case 'STATUS_UPDATED':
                      const isResolved = event.details?.toStatus === 'RESOLVED' || event.details?.toStatus === 'CLOSED';
                      icon = isResolved ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <RefreshCw className="w-3 h-3 text-blue-600" />;
                      bgColor = isResolved ? 'bg-green-100' : 'bg-blue-100';
                      title = `Status updated to ${event.details?.toStatus?.replace('_', ' ')}`;
                      description = event.details?.remarks ? `"${event.details.remarks}"` : 'Status changed by administration.';
                      break;
                    case 'DEPARTMENT_TRANSFER':
                      icon = <Building className="w-3 h-3 text-purple-600" />;
                      bgColor = 'bg-purple-100';
                      title = 'Department Transferred';
                      description = 'Grievance transferred to another department for resolution.';
                      break;
                  }

                  const performer = typeof event.performedBy === 'object' 
                    ? `${event.performedBy.firstName} ${event.performedBy.lastName}` 
                    : 'System';
                  const role = typeof event.performedBy === 'object' ? event.performedBy.role : '';

                  return (
                    <div key={index} className="relative">
                      <div className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full ${bgColor} border-2 border-white flex items-center justify-center z-10`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{title}</p>
                          <span className="text-xs text-gray-500 font-medium">
                            {format(new Date(event.timestamp), 'MMM dd, yyyy • hh:mm a')}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-700">{description}</p>
                          <div className="flex items-center mt-2 space-x-2">
                             <div className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">
                               {role || 'AGENT'}
                             </div>
                             <span className="text-xs text-gray-400">By {performer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback to StatusHistory if timeline doesn't exist (compatibility)
                grievance.statusHistory?.map((history, index) => {
                  if (index === 0 && history.status === 'PENDING') return null; // Avoid duplicate start
                  return (
                    <div key={`hist-${index}`} className="relative">
                      <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center z-10">
                        <RefreshCw className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Status: {history.status}</p>
                          <span className="text-xs text-gray-500 font-medium">
                            {format(new Date(history.changedAt), 'MMM dd, yyyy • hh:mm a')}
                          </span>
                        </div>
                        {history.remarks && <p className="text-sm text-gray-600 mt-1 italic">"{history.remarks}"</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Resolution Details */}
          {(grievance as any).resolution && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Resolution</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-base text-gray-900 whitespace-pre-wrap">{(grievance as any).resolution}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrievanceDetailDialog;
