'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grievance } from '@/lib/api/grievance';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Calendar, 
  User, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Building,
  Phone,
  MessageCircle,
  MapPin,
  FileText,
  Tag,
  AlertCircle,
  X,
  ExternalLink,
  Image as ImageIcon,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';

// Helper function to detect document type
const getDocumentType = (url: string): { isDocument: boolean; type: string; icon: string; color: string } => {
  if (!url) return { isDocument: false, type: 'unknown', icon: 'file', color: 'slate' };
  
  const urlLower = url.toLowerCase();
  
  // PDF
  if (urlLower.endsWith('.pdf')) {
    return { isDocument: true, type: 'PDF Document', icon: 'pdf', color: 'red' };
  }
  
  // Microsoft Word
  if (urlLower.match(/\.(doc|docx)$/)) {
    return { isDocument: true, type: 'Word Document', icon: 'word', color: 'blue' };
  }
  
  // Microsoft Excel
  if (urlLower.match(/\.(xls|xlsx|csv)$/)) {
    return { isDocument: true, type: 'Excel Spreadsheet', icon: 'excel', color: 'green' };
  }
  
  // Microsoft PowerPoint
  if (urlLower.match(/\.(ppt|pptx)$/)) {
    return { isDocument: true, type: 'PowerPoint', icon: 'powerpoint', color: 'orange' };
  }
  
  // Text files
  if (urlLower.match(/\.(txt|log)$/)) {
    return { isDocument: true, type: 'Text File', icon: 'text', color: 'gray' };
  }
  
  // Archives
  if (urlLower.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return { isDocument: true, type: 'Archive', icon: 'archive', color: 'purple' };
  }
  
  // Images
  if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
    return { isDocument: false, type: 'image', icon: 'image', color: 'pink' };
  }
  
  // Default for other documents
  return { isDocument: true, type: 'Document', icon: 'file', color: 'slate' };
};

// Helper function to fix Cloudinary URLs for PDFs and documents
const fixCloudinaryUrl = (url: string): string => {
  if (!url) return url;
  
  // Only process actual Cloudinary URLs (not WhatsApp media IDs)
  if (!url.startsWith('http') || !url.includes('cloudinary.com')) {
    return url; // Return as-is if not a Cloudinary URL
  }
  
  // We no longer add fl_attachment as we want to view documents in the browser tab
  return url;
};


interface GrievanceDetailDialogProps {
  isOpen: boolean;
  grievance: Grievance | null;
  onClose: () => void;
}

const GrievanceDetailDialog: React.FC<GrievanceDetailDialogProps> = ({ isOpen, grievance, onClose }) => {
  if (!isOpen || !grievance) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return { 
          bg: 'bg-emerald-100', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Resolved',
          gradient: 'from-emerald-500 to-green-600'
        };
      case 'CLOSED':
        return { 
          bg: 'bg-slate-100', 
          text: 'text-slate-700', 
          border: 'border-slate-200',
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Closed',
          gradient: 'from-slate-500 to-gray-600'
        };
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return { 
          bg: 'bg-blue-100', 
          text: 'text-blue-700', 
          border: 'border-blue-200',
          icon: <RefreshCw className="w-4 h-4" />,
          label: status === 'ASSIGNED' ? 'Assigned' : 'In Progress',
          gradient: 'from-blue-500 to-indigo-600'
        };
      case 'PENDING':
        return { 
          bg: 'bg-amber-100', 
          text: 'text-amber-700', 
          border: 'border-amber-200',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending',
          gradient: 'from-amber-500 to-orange-600'
        };
      default:
        return { 
          bg: 'bg-gray-100', 
          text: 'text-gray-700', 
          border: 'border-gray-200',
          icon: <AlertCircle className="w-4 h-4" />,
          label: status,
          gradient: 'from-gray-500 to-slate-600'
        };
    }
  };

  const statusConfig = getStatusConfig(grievance.status);
  const createdDate = new Date(grievance.createdAt);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  // Get assigned user info
  const assignedTo = grievance.assignedTo && typeof grievance.assignedTo === 'object' 
    ? `${(grievance.assignedTo as any).firstName} ${(grievance.assignedTo as any).lastName}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-white animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${statusConfig.gradient} p-5 relative overflow-hidden flex-shrink-0`}>
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">Grievance Details</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[11px] font-bold text-white backdrop-blur-sm">
                      {grievance.grievanceId}
                    </span>
                    <span className="text-white/80 text-xs">•</span>
                    <span className="text-white/80 text-xs">{timeAgo}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all backdrop-blur-sm flex-shrink-0"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
                {statusConfig.icon}
                <span className={`font-bold text-xs ${statusConfig.text}`}>{statusConfig.label}</span>
              </div>
              {assignedTo && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <UserCheck className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white font-medium">Assigned to {assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Citizen Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Citizen Information
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name</p>
                    <p className="text-sm font-bold text-slate-800 break-words">{grievance.citizenName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</p>
                    <p className="text-sm font-bold text-slate-800">{grievance.citizenPhone}</p>
                  </div>
                </div>

                {/* {grievance.citizenWhatsApp && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">WhatsApp</p>
                      <p className="text-sm font-bold text-slate-800">{grievance.citizenWhatsApp}</p>
                    </div>
                  </div>
                )} */}
              </div>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Citizen</span>
              </div>
              <p className="text-sm font-bold text-gray-900 truncate" title={grievance.citizenName}>{grievance.citizenName}</p>
            </div> */}

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-3 border border-purple-100 group relative">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-[10px] font-bold text-purple-600 uppercase">Category</span>
              </div>
              <p className="text-sm font-bold text-gray-900 break-words">
                {grievance.category || 'General'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Filed On</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{format(createdDate, 'dd MMM yyyy')}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase">Time</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{format(createdDate, 'hh:mm a')}</p>
            </div>
          </div>


          {/* Grievance Description */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Grievance Description
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {grievance.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          {/* {grievance.location && (grievance.location.address || grievance.location.coordinates) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-50 to-emerald-50 px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Location Information
                </h3>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {grievance.location.address && (
                      <p className="text-sm font-medium text-slate-800 mb-2">{grievance.location.address}</p>
                    )}
                    {grievance.location.coordinates && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                          {grievance.location.coordinates[1]?.toFixed(6)}, {grievance.location.coordinates[0]?.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${grievance.location.coordinates[1]},${grievance.location.coordinates[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Media/Photos */}
          {grievance.media && grievance.media.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-50 to-pink-50 px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-600" />
                  Uploaded Media
                  <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-xs font-bold">
                    {grievance.media.length}
                  </span>
                </h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {grievance.media.map((media: any, index: number) => {
                    const fixedUrl = fixCloudinaryUrl(media.url);
                    const docInfo = getDocumentType(media.url);
                    
                    // Color mapping for different document types
                    const colorMap: Record<string, { from: string; to: string; text: string; hover: string }> = {
                      red: { from: 'from-red-50', to: 'to-orange-50', text: 'text-red-700', hover: 'hover:from-red-100 hover:to-orange-100' },
                      blue: { from: 'from-blue-50', to: 'to-indigo-50', text: 'text-blue-700', hover: 'hover:from-blue-100 hover:to-indigo-100' },
                      green: { from: 'from-green-50', to: 'to-emerald-50', text: 'text-green-700', hover: 'hover:from-green-100 hover:to-emerald-100' },
                      orange: { from: 'from-orange-50', to: 'to-amber-50', text: 'text-orange-700', hover: 'hover:from-orange-100 hover:to-amber-100' },
                      purple: { from: 'from-purple-50', to: 'to-fuchsia-50', text: 'text-purple-700', hover: 'hover:from-purple-100 hover:to-fuchsia-100' },
                      gray: { from: 'from-gray-50', to: 'to-slate-50', text: 'text-gray-700', hover: 'hover:from-gray-100 hover:to-slate-100' },
                      slate: { from: 'from-slate-100', to: 'to-slate-200', text: 'text-slate-700', hover: 'hover:from-slate-200 hover:to-slate-300' },
                    };
                    
                    const colors = colorMap[docInfo.color] || colorMap.slate;
                    
                    return (
                      <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video">
                        {docInfo.isDocument ? (
                          // Document Preview (PDF, Word, Excel, PowerPoint, etc.)
                          <a
                            href={fixedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex flex-col items-center justify-center w-full h-full bg-gradient-to-br ${colors.from} ${colors.to} ${colors.hover} transition-all cursor-pointer`}
                          >
                            <FileText className={`w-12 h-12 ${colors.text} mb-2`} />
                            <span className={`text-xs font-bold ${colors.text}`}>{docInfo.type}</span>
                            <span className={`text-[10px] ${colors.text} opacity-70 mt-1`}>Click to view/download</span>
                          </a>
                        ) : (
                          // Image Preview
                          <>
                            <Image
                              src={fixedUrl}
                              alt={`Upload ${index + 1}`}
                              fill
                              sizes="(max-width: 768px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                              onClick={() => window.open(fixedUrl, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Service Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Service Timeline
              </h3>
            </div>
            <div className="p-5">
              <div className="relative pl-8 space-y-6">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 to-slate-200 rounded-full"></div>
                
                {/* Creation Entry */}
                <div className="relative">
                  <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Calendar className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Grievance Registered</span>
                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                        {format(createdDate, 'MMM dd, yyyy • hh:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Grievance successfully submitted via WhatsApp Chatbot</p>
                  </div>
                </div>

                {/* Dynamic Timeline Entries */}
                {grievance.timeline && grievance.timeline.length > 0 ? (
                  grievance.timeline.map((event, index) => {
                    if (event.action === 'CREATED') return null;

                    let iconBg = 'bg-blue-500';
                    let cardBg = 'from-blue-50 to-indigo-50';
                    let borderColor = 'border-blue-100';
                    let textColor = 'text-blue-700';
                    let icon = <RefreshCw className="w-3 h-3 text-white" />;
                    let title = 'Activity Logged';
                    let description = '';

                    switch (event.action) {
                      case 'ASSIGNED':
                        iconBg = 'bg-orange-500';
                        cardBg = 'from-orange-50 to-amber-50';
                        borderColor = 'border-orange-100';
                        textColor = 'text-orange-700';
                        icon = <User className="w-3 h-3 text-white" />;
                        title = 'Officer Assigned';
                        description = `Assigned to ${event.details?.toUserName || 'an officer'}`;
                        break;
                      case 'STATUS_UPDATED':
                        const isResolved = event.details?.toStatus === 'RESOLVED' || event.details?.toStatus === 'CLOSED';
                        iconBg = isResolved ? 'bg-emerald-500' : 'bg-blue-500';
                        cardBg = isResolved ? 'from-emerald-50 to-green-50' : 'from-blue-50 to-indigo-50';
                        borderColor = isResolved ? 'border-emerald-100' : 'border-blue-100';
                        textColor = isResolved ? 'text-emerald-700' : 'text-blue-700';
                        icon = isResolved ? <CheckCircle2 className="w-3 h-3 text-white" /> : <RefreshCw className="w-3 h-3 text-white" />;
                        title = `Status: ${event.details?.toStatus?.replace('_', ' ')}`;
                        description = event.details?.remarks || 'Status updated by administration';
                        break;
                      case 'DEPARTMENT_TRANSFER':
                        iconBg = 'bg-purple-500';
                        cardBg = 'from-purple-50 to-fuchsia-50';
                        borderColor = 'border-purple-100';
                        textColor = 'text-purple-700';
                        icon = <Building className="w-3 h-3 text-white" />;
                        title = 'Department Transferred';
                        description = 'Transferred to another department for resolution';
                        break;
                    }

                    const performer = typeof event.performedBy === 'object' 
                      ? `${event.performedBy.firstName} ${event.performedBy.lastName}` 
                      : 'System';

                    return (
                      <div key={index} className="relative">
                        <div className={`absolute -left-8 top-0 w-6 h-6 rounded-full ${iconBg} flex items-center justify-center shadow-lg`}>
                          {icon}
                        </div>
                        <div className={`bg-gradient-to-r ${cardBg} rounded-xl p-4 border ${borderColor} ml-2`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold ${textColor} uppercase tracking-wide`}>{title}</span>
                            <span className="text-[10px] text-slate-500 font-medium bg-white/50 px-2 py-0.5 rounded-full">
                              {format(new Date(event.timestamp), 'MMM dd, yyyy • hh:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">By {performer}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  grievance.statusHistory?.map((history, index) => {
                    if (index === 0 && history.status === 'PENDING') return null;
                    return (
                      <div key={`hist-${index}`} className="relative">
                        <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                          <RefreshCw className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 ml-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Status: {history.status}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {format(new Date(history.changedAt), 'MMM dd, yyyy • hh:mm a')}
                            </span>
                          </div>
                          {history.remarks && <p className="text-sm text-slate-600 italic">&ldquo;{history.remarks}&rdquo;</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Resolution Details */}
          {grievance.resolution && (
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">Resolution Summary</h3>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{grievance.resolution}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
          <Button 
            onClick={onClose}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-all"
          >
            Close
          </Button>
        </div>
      </div>
      

    </div>
  );
};

export default GrievanceDetailDialog;
