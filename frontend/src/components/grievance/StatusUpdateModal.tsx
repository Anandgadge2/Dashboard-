'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, MessageSquare, Calendar, Upload, FileText, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'grievance' | 'appointment';
  currentStatus: string;
  onSuccess: () => void;
  /** Prefill for Set Time when updating appointment to Confirmed */
  appointmentDate?: string;
  appointmentTime?: string;
}

const grievanceStatuses = [
  { value: 'PENDING', label: 'Pending', color: 'yellow', icon: '⏳' },
  { value: 'ASSIGNED', label: 'Assigned', color: 'blue', icon: '👤' },
  { value: 'RESOLVED', label: 'Resolved', color: 'green', icon: '✅' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red', icon: '❌' }
];

const appointmentStatuses = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'blue', icon: '📅' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'green', icon: '✅' },
  { value: 'COMPLETED', label: 'Completed', color: 'green', icon: '🎉' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red', icon: '❌' }
];

export default function StatusUpdateModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  currentStatus,
  onSuccess,
  appointmentDate: initialAppointmentDate,
  appointmentTime: initialAppointmentTime
}: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSetTimeModal, setShowSetTimeModal] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState('');
  const [confirmedDate, setConfirmedDate] = useState('');
  const [resolutionDocument, setResolutionDocument] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const statuses = itemType === 'grievance' ? grievanceStatuses : appointmentStatuses;

  // Reset state when modal opens/closes or currentStatus changes
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setRemarks('');
      setShowSetTimeModal(false);
      if (initialAppointmentDate) {
        try {
          const d = new Date(initialAppointmentDate);
          setConfirmedDate(d.toISOString().slice(0, 10));
        } catch {
          setConfirmedDate('');
        }
      } else {
        setConfirmedDate('');
      }
      if (initialAppointmentTime) {
        const t = String(initialAppointmentTime).trim();
        if (/^\d{1,2}:\d{2}$/.test(t)) setConfirmedTime(t);
        else setConfirmedTime('');
      } else {
        setConfirmedTime('');
      }
      setResolutionDocument(null);
    }
  }, [isOpen, currentStatus, initialAppointmentDate, initialAppointmentTime]);

  const getStatusColor = (color: string, isSelected: boolean) => {
    const colors = {
      yellow: isSelected 
        ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/30' 
        : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
      blue: isSelected 
        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30' 
        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      green: isSelected 
        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-500 shadow-lg shadow-green-500/30' 
        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      red: isSelected 
        ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-red-500 shadow-lg shadow-red-500/30' 
        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      gray: isSelected 
        ? 'bg-gradient-to-br from-gray-500 to-slate-600 text-white border-gray-500 shadow-lg shadow-gray-500/30' 
        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  const getCurrentStatusInfo = () => {
    return statuses.find(s => s.value === currentStatus) || { label: currentStatus, color: 'gray', icon: '' };
  };

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) {
      toast.error('Please select a different status');
      return;
    }
    if (itemType === 'appointment' && selectedStatus === 'CONFIRMED' && (!confirmedTime || !confirmedDate)) {
      toast.error('Please set the confirmed date and time first');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload document first if provided
      let documentUrl = '';
      if (resolutionDocument && itemType === 'grievance' && selectedStatus === 'RESOLVED') {
        try {
          setUploading(true);
          const formData = new FormData();
          formData.append('document', resolutionDocument);
          
          const uploadResponse = await apiClient.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (uploadResponse.success && uploadResponse.data?.url) {
            documentUrl = uploadResponse.data.url;
          }
        } catch (uploadError) {
          console.error('Document upload failed:', uploadError);
          toast.error('Failed to upload document, but continuing with status update');
        } finally {
          setUploading(false);
        }
      }
      
      const body: { status: string; remarks: string; appointmentTime?: string; appointmentDate?: string; resolutionDocumentUrl?: string } = {
        status: selectedStatus,
        remarks
      };
      
      if (documentUrl) {
        body.resolutionDocumentUrl = documentUrl;
      }
      
      if (itemType === 'appointment' && selectedStatus === 'CONFIRMED' && confirmedTime && confirmedDate) {
        body.appointmentTime = confirmedTime;
        body.appointmentDate = new Date(confirmedDate).toISOString();
      }
      const response = await apiClient.put(
        `/status/${itemType}/${itemId}`,
        body
      );

      if (response.success) {
        toast.success(
          `${itemType === 'grievance' ? 'Grievance' : 'Appointment'} status updated! Citizen notified via WhatsApp.`,
          { duration: 5000 }
        );
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSelect = (value: string) => {
    if (value === currentStatus) return;
    setSelectedStatus(value);
    if (itemType === 'appointment' && value === 'CONFIRMED') {
      setShowSetTimeModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, PNG, and DOC files are allowed');
        return;
      }
      setResolutionDocument(file);
      toast.success('Document selected');
    }
  };

  const handleRemoveDocument = () => {
    setResolutionDocument(null);
  };

  if (!isOpen) return null;

  const currentStatusInfo = getCurrentStatusInfo();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white p-6 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[150px]"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Update Status</h2>
                <p className="text-white/90 text-sm mt-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Change status and notify citizen via WhatsApp
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all backdrop-blur-sm flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Current Status Card */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Current Status</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{currentStatusInfo.icon} {currentStatusInfo.label}</p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
              Select New Status
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map((status) => {
                const isSelected = selectedStatus === status.value;
                const isCurrent = status.value === currentStatus;
                return (
                  <button
                    key={status.value}
                    onClick={() => !isCurrent && handleStatusSelect(status.value)}
                    disabled={isCurrent}
                    className={`
                      px-5 py-4 rounded-xl border-2 font-bold text-sm transition-all duration-200
                      ${getStatusColor(status.color, isSelected)}
                      ${isCurrent ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'}
                      ${isSelected ? 'ring-4 ring-offset-2 ring-blue-300' : ''}
                    `}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">{status.icon}</span>
                      <span>{status.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Set confirmed time (appointment + Confirmed only) - inline summary + opens Set Time dialog */}
          {itemType === 'appointment' && selectedStatus === 'CONFIRMED' && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50/30 rounded-2xl p-6 border-2 border-emerald-200 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Confirmed date & time
                <span className="text-red-500 text-xs font-normal">*</span>
              </label>
              {confirmedDate && confirmedTime ? (
                <p className="text-sm text-emerald-800 font-medium">
                  {new Date(confirmedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {confirmedTime}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setShowSetTimeModal(true)}
                className="mt-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {confirmedDate && confirmedTime ? 'Change time' : 'Set time'}
              </button>
            </div>
          )}

          {/* Upload Resolution Document (grievance + Resolved only) */}
          {itemType === 'grievance' && selectedStatus === 'RESOLVED' && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50/50 to-teal-50/30 rounded-2xl p-6 border-2 border-green-200 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <FileText className="w-4 h-4 text-green-600" />
                Resolution Document
                <span className="text-xs font-normal text-gray-500 ml-1">(Optional)</span>
              </label>
              <p className="text-xs text-gray-600 mb-4">
                Upload a document (PDF, JPG, PNG, DOC) related to the resolution. This will be sent to the citizen via WhatsApp.
              </p>
              
              {!resolutionDocument ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-300 rounded-xl cursor-pointer bg-white hover:bg-green-50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-gray-600 font-semibold">Click to upload document</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (Max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white border-2 border-green-300 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 truncate max-w-xs">
                        {resolutionDocument.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(resolutionDocument.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDocument}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Remarks Section - Enhanced */}
          <div className="bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Remarks / Notes
              <span className="text-xs font-normal text-gray-500 ml-1">(Optional but recommended)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={6}
              className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all bg-white shadow-sm hover:shadow-md text-sm placeholder:text-gray-400"
              placeholder="Add any notes, comments, or instructions about this status change. These remarks will be included in the WhatsApp notification sent to the citizen..."
            />
            <div className="mt-3 flex items-start gap-2 bg-blue-50/50 rounded-lg p-3 border border-blue-100">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                These remarks will be visible to the citizen in the WhatsApp notification message.
              </p>
            </div>
          </div>

          {/* Notification Info Box - Enhanced */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 border-2 border-amber-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-1.5">
                Citizen Will Be Notified
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                The citizen will receive a WhatsApp message about this status update automatically. The message will include the new status and any remarks you add above.
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-5 flex justify-end gap-3 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-semibold disabled:opacity-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={selectedStatus === currentStatus || submitting}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-bold shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Update Status & Notify</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Set Time dialog (when appointment + Confirmed) */}
      {showSetTimeModal && itemType === 'appointment' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Set confirmed time</h3>
                    <p className="text-white/90 text-sm mt-0.5">Date and time for the appointment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetTimeModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={confirmedDate}
                  onChange={(e) => setConfirmedDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time</label>
                <input
                  type="time"
                  value={confirmedTime}
                  onChange={(e) => setConfirmedTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSetTimeModal(false)}
                className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowSetTimeModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
