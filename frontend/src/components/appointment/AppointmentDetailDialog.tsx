'use client';

import { format } from 'date-fns';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/lib/api/appointment';
import { 
  Calendar, 
  User, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock,
  Building,
  AlertCircle
} from 'lucide-react';

interface AppointmentDetailDialogProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

const AppointmentDetailDialog: React.FC<AppointmentDetailDialogProps> = ({ isOpen, appointment, onClose }) => {
  if (!isOpen || !appointment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
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
              <CardTitle>Appointment Details</CardTitle>
              <CardDescription>Reference: {appointment.appointmentId}</CardDescription>
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
                <p className="text-base font-semibold text-gray-900">{appointment.citizenName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-base text-gray-900">{appointment.citizenPhone}</p>
              </div>
              {appointment.citizenWhatsApp && (
                <div>
                  <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                  <p className="text-base text-gray-900">{appointment.citizenWhatsApp}</p>
                </div>
              )}
              {appointment.citizenEmail && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base text-gray-900">{appointment.citizenEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Appointment Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Purpose</p>
                <p className="text-base text-gray-900">{appointment.purpose}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-base text-gray-900">
                    {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-base text-gray-900">{appointment.appointmentTime}</p>
                </div>
                {appointment.duration && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Duration</p>
                    <p className="text-base text-gray-900">{appointment.duration} minutes</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          {appointment.location && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Location</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-base text-gray-900">{appointment.location}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-base text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            </div>
          )}

          {/* Cancellation Details */}
          {(appointment as any).cancellationReason && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Cancellation Details</h3>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                <p className="text-base text-gray-900">{(appointment as any).cancellationReason}</p>
                {(appointment as any).cancelledAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Cancelled on: {new Date((appointment as any).cancelledAt).toLocaleString()}
                  </p>
                )}
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
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Appointment Booked</p>
                    <span className="text-xs text-gray-500 font-medium">
                      {format(new Date(appointment.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Appointment successfully scheduled via WhatsApp Chatbot.</p>
                </div>
              </div>

              {/* Dynamic Timeline Entries */}
              {appointment.timeline && appointment.timeline.length > 0 ? (
                appointment.timeline.map((event, index) => {
                  if (event.action === 'CREATED') return null;

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
                      const isSuccess = event.details?.toStatus === 'COMPLETED' || event.details?.toStatus === 'CONFIRMED';
                      const isFailure = event.details?.toStatus === 'CANCELLED' || event.details?.toStatus === 'NO_SHOW';
                      
                      icon = isSuccess ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                             isFailure ? <AlertCircle className="w-3 h-3 text-red-600" /> : 
                             <RefreshCw className="w-3 h-3 text-blue-600" />;
                             
                      bgColor = isSuccess ? 'bg-green-100' : isFailure ? 'bg-red-100' : 'bg-blue-100';
                      title = `Status: ${event.details?.toStatus?.replace('_', ' ')}`;
                      description = event.details?.remarks ? `"${event.details.remarks}"` : 'Status updated by administration.';
                      break;
                    case 'DEPARTMENT_TRANSFER':
                      icon = <Building className="w-3 h-3 text-purple-600" />;
                      bgColor = 'bg-purple-100';
                      title = 'Department Sync';
                      description = 'Appointment department synchronized with assigned officer.';
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
                // Fallback (for older records)
                (appointment as any).completedAt && (
                   <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center z-10">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Completed</p>
                        <span className="text-xs text-gray-500 font-medium">
                          {format(new Date((appointment as any).completedAt), 'MMM dd, yyyy • hh:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentDetailDialog;
