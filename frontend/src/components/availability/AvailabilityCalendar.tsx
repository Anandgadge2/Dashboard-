'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { availabilityAPI, AppointmentAvailability, DayAvailability, SpecialDate, Holiday } from '@/lib/api/availability';
import toast from 'react-hot-toast';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  RotateCcw,
  Info,
  CalendarDays,
  PartyPopper,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AvailabilityCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId?: string;
}

type DayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

const DAYS_OF_WEEK: { key: DayName; label: string; short: string }[] = [
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' }
];

export default function AvailabilityCalendar({ isOpen, onClose, departmentId }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AppointmentAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'holidays'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [togglingDate, setTogglingDate] = useState(false);

  // Fetch availability settings
  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const response = await availabilityAPI.get(departmentId);
      if (response && response.availability) {
        setAvailability(response.availability);
      }
    } catch (error: any) {
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    try {
      const response = await availabilityAPI.getHolidays(currentMonth.getFullYear());
      if (response && response.holidays) {
        setHolidays(response.holidays);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailability();
      fetchHolidays();
    }
  }, [isOpen, fetchAvailability, fetchHolidays]);

  // Save changes
  const handleSave = async () => {
    if (!availability) return;

    try {
      setSaving(true);
      const response = await availabilityAPI.update({
        ...availability,
        departmentId
      });
      
      if (response && response.availability) {
        toast.success('Availability settings saved successfully!');
        setHasChanges(false);
      }
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    fetchAvailability();
    setHasChanges(false);
    toast.success('Settings reset to last saved state');
  };

  // Update day availability
  const updateDayAvailability = (day: DayName, updates: Partial<DayAvailability>) => {
    if (!availability) return;
    
    setAvailability({
      ...availability,
      weeklySchedule: {
        ...availability.weeklySchedule,
        [day]: {
          ...availability.weeklySchedule[day],
          ...updates
        }
      }
    });
    setHasChanges(true);
  };

  // Update settings
  const updateSettings = (updates: Partial<AppointmentAvailability>) => {
    if (!availability) return;
    setAvailability({ ...availability, ...updates });
    setHasChanges(true);
  };

  // Add holiday
  const addHoliday = async (holiday: Holiday) => {
    try {
      const specialDate: SpecialDate = {
        date: holiday.date,
        type: 'holiday',
        name: holiday.name,
        isAvailable: false
      };
      
      const response = await availabilityAPI.addSpecialDate(specialDate, departmentId);
      if (response && response.availability) {
        setAvailability(response.availability);
        toast.success(`${holiday.name} added as holiday`);
      }
    } catch (error) {
      toast.error('Failed to add holiday');
    }
  };

  // Remove special date
  const removeSpecialDate = async (date: string) => {
    try {
      const response = await availabilityAPI.removeSpecialDate(date, departmentId);
      if (response && response.availability) {
        setAvailability(response.availability);
        toast.success('Date removed successfully');
      }
    } catch (error) {
      toast.error('Failed to remove date');
    }
  };

  // Toggle a specific date Available / Unavailable (writes to specialDates)
  const setSelectedDateAvailability = async (isAvailable: boolean) => {
    if (!selectedDate || !availability) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    setTogglingDate(true);
    try {
      await removeSpecialDate(dateStr);
      if (!isAvailable) {
        const specialDate: SpecialDate = {
          date: dateStr,
          type: 'custom',
          name: 'Unavailable',
          isAvailable: false
        };
        const response = await availabilityAPI.addSpecialDate(specialDate, departmentId);
        if (response?.availability) setAvailability(response.availability);
        toast.success('Date marked as unavailable');
      } else {
        toast.success('Date uses default availability');
      }
    } catch (error) {
      toast.error('Failed to update date');
    } finally {
      setTogglingDate(false);
    }
  };

  // Get calendar days for the month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Check if a date is a holiday/special date
  const getSpecialDateInfo = (date: Date) => {
    if (!availability) return null;
    return availability.specialDates.find(sd => {
      const sdDate = new Date(sd.date);
      return sdDate.getFullYear() === date.getFullYear() &&
             sdDate.getMonth() === date.getMonth() &&
             sdDate.getDate() === date.getDate();
    });
  };

  // Check if a date is available based on weekly schedule
  const isDateAvailable = (date: Date) => {
    if (!availability) return false;
    
    const specialDate = getSpecialDateInfo(date);
    if (specialDate) return specialDate.isAvailable;

    const dayName = DAYS_OF_WEEK[date.getDay()].key;
    return availability.weeklySchedule[dayName].isAvailable;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-full sm:max-w-5xl h-full sm:max-h-[90vh] overflow-hidden border-0 sm:border border-slate-200/50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight drop-shadow-sm">Appointment Availability</h2>
                <p className="text-white/90 text-sm mt-0.5 font-medium">Configure your booking schedule with ease</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm overflow-x-auto">
          <div className="flex gap-1 px-2 sm:px-4 py-2 min-w-max">
            {[
              { id: 'calendar', label: 'Calendar View', icon: CalendarDays, tooltip: 'Set available days and mark dates' },
              { id: 'holidays', label: 'Holidays', icon: PartyPopper, tooltip: 'Add holidays and blocked dates' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                title={tab.tooltip}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(90vh-200px)] custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Calendar View Tab */}
              {activeTab === 'calendar' && availability && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 rounded-2xl border border-indigo-100">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>Set default available days below, then click any date on the calendar to mark it Available or Unavailable. Changes apply to the chatbot booking flow.</span>
                  </div>

                  {/* Default week: Available / Unavailable per day (no time settings) */}
                  <Card className="border-2 border-slate-200/80 shadow-sm overflow-hidden">
                    <CardHeader className="pb-3 pt-5">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Default week
                      </CardTitle>
                      <CardDescription>Toggle which weekdays are available for appointments by default</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-5">
                      <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                        {DAYS_OF_WEEK.map((day) => {
                          const dayAvailability = availability.weeklySchedule[day.key];
                          const isWeekend = day.key === 'saturday' || day.key === 'sunday';
                          return (
                            <div
                              key={day.key}
                              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all min-w-[72px] ${
                                dayAvailability.isAvailable
                                  ? 'border-emerald-200 bg-emerald-50/80'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <span className={`text-xs font-bold uppercase tracking-wide ${isWeekend ? 'text-rose-600' : 'text-slate-600'}`}>
                                {day.short}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDayAvailability(day.key, { isAvailable: !dayAvailability.isAvailable })}
                                title={dayAvailability.isAvailable ? 'Mark unavailable' : 'Mark available'}
                                className={`w-14 h-8 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                                  dayAvailability.isAvailable
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-100'
                                    : 'bg-gradient-to-r from-slate-300 to-slate-400 shadow-md shadow-slate-100'
                                } hover:scale-105 active:scale-95`}
                              >
                                <span
                                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${
                                    dayAvailability.isAvailable ? 'left-7' : 'left-1'
                                  }`}
                                >
                                  {dayAvailability.isAvailable ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </span>
                              </button>
                              <span className={`text-xs font-bold transition-colors duration-300 ${dayAvailability.isAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {dayAvailability.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between max-w-3xl mx-auto px-1">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      title="Previous month"
                      className="p-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-slate-600 hover:text-indigo-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-slate-800">
                      {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      title="Next month"
                      className="p-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-slate-600 hover:text-indigo-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-md max-w-3xl mx-auto">
                    {/* Week Headers */}
                    <div className="grid grid-cols-7 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={day.key}
                          className={`py-2.5 text-center text-xs font-bold uppercase tracking-wider ${
                            day.key === 'sunday' || day.key === 'saturday'
                              ? 'text-rose-500'
                              : 'text-slate-600'
                          }`}
                        >
                          {day.short}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                      {getCalendarDays().map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="p-1.5 h-16 bg-slate-50/30 border-r border-b border-slate-100" />;
                        }

                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                        const isAvailable = isDateAvailable(date);
                        const specialDate = getSpecialDateInfo(date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isSelected = selectedDate?.toDateString() === date.toDateString();

                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => setSelectedDate(isSelected ? null : date)}
                            disabled={isPast}
                            title={specialDate?.name || (isAvailable ? 'Available for appointments' : 'Not available')}
                            className={`p-1.5 h-16 border-r border-b border-slate-100 transition-all duration-200 text-left relative group flex flex-col ${
                              isPast
                                ? 'bg-slate-100/50 text-slate-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-100 ring-2 ring-indigo-500 ring-inset'
                                : specialDate?.type === 'holiday'
                                ? 'bg-rose-50 hover:bg-rose-100'
                                : isAvailable
                                ? 'bg-emerald-50/50 hover:bg-emerald-100/50'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                                isToday
                                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md'
                                  : isWeekend
                                  ? 'text-rose-500'
                                  : 'text-slate-700'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            
                            {specialDate && (
                              <span className={`mt-0.5 text-[8px] px-1 py-0.5 rounded truncate max-w-full ${
                                specialDate.type === 'holiday'
                                  ? 'bg-rose-200 text-rose-700'
                                  : 'bg-blue-200 text-blue-700'
                              }`}>
                                {specialDate.name?.split(' ')[0] || 'Custom'}
                              </span>
                            )}

                            {!isPast && !specialDate && (
                              <div className="absolute bottom-1.5 right-1.5">
                                {isAvailable ? (
                                  <div className="bg-emerald-100/80 p-0.5 rounded-full backdrop-blur-sm">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </div>
                                ) : (
                                  <div className="bg-slate-100/80 p-0.5 rounded-full backdrop-blur-sm">
                                    <XCircle className="w-4 h-4 text-slate-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-5 justify-center text-sm py-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-slate-700 font-medium">Available</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                      <div className="w-3 h-3 rounded-full bg-slate-400" />
                      <span className="text-slate-700 font-medium">Unavailable</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-slate-700 font-medium">Holiday</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200">
                      <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      <span className="text-slate-700 font-medium">Today</span>
                    </div>
                  </div>

                  {/* Selected Date: Available / Unavailable toggle */}
                  {selectedDate && (
                    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                          <CalendarDays className="w-5 h-5 text-indigo-600" />
                          {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </CardTitle>
                        <CardDescription>Mark this date as Available or Unavailable for appointments</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const specialDate = getSpecialDateInfo(selectedDate);
                          const dayName = DAYS_OF_WEEK[selectedDate.getDay()].key;
                          const daySchedule = availability.weeklySchedule[dayName];
                          const currentlyAvailable = specialDate ? specialDate.isAvailable : daySchedule?.isAvailable ?? false;
                          return (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-600">Status:</span>
                                
                                <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${
                                  currentlyAvailable 
                                    ? 'bg-emerald-50/50 border-emerald-200 shadow-sm shadow-emerald-100/50' 
                                    : 'bg-rose-50/50 border-rose-200 shadow-sm shadow-rose-100/50'
                                }`}>
                                  <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold transition-colors duration-300 ${!currentlyAvailable ? 'text-rose-600' : 'text-slate-400'}`}>
                                      Unavailable
                                    </span>
                                    
                                    <button
                                      type="button"
                                      disabled={togglingDate}
                                      onClick={() => {
                                        const newStatus = !currentlyAvailable;
                                        setSelectedDateAvailability(newStatus);
                                        setHasChanges(true);
                                      }}
                                      className={`w-14 h-8 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                                        currentlyAvailable
                                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-100'
                                          : 'bg-gradient-to-r from-slate-300 to-slate-400 shadow-md shadow-slate-100'
                                      } ${togglingDate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                                    >
                                      <div
                                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center ${
                                          currentlyAvailable ? 'translate-x-[24px]' : 'translate-x-0'
                                        }`}
                                      >
                                        {currentlyAvailable ? (
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </div>
                                    </button>
                                    
                                    <span className={`text-sm font-bold transition-colors duration-300 ${currentlyAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      Available
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {specialDate && (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  specialDate.type === 'holiday' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {specialDate.type === 'holiday' ? 'Holiday' : 'Custom'}
                                  {specialDate.name ? `: ${specialDate.name}` : ''}
                                </span>
                              )}
                              {togglingDate && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                  Updating…
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Holidays Tab */}
              {activeTab === 'holidays' && availability && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3 rounded-2xl border border-rose-100">
                    <Info className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Add Indian national holidays or custom holidays. These dates will be blocked in the chatbot booking flow.</span>
                  </div>

                  {/* Add Indian Holidays */}
                  <Card className="border-2 border-slate-200/80 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-rose-50 border-b border-amber-100">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Indian Holidays — {currentMonth.getFullYear()}
                      </CardTitle>
                      <CardDescription>Click a holiday to add it as an unavailable date</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {holidays.map((holiday) => {
                          const isAdded = availability.specialDates.some(
                            sd => String(sd.date).includes(holiday.date) && sd.type === 'holiday'
                          );
                          return (
                            <button
                              key={holiday.date}
                              onClick={() => !isAdded && addHoliday(holiday)}
                              disabled={isAdded}
                              title={isAdded ? 'Already added' : `Add ${holiday.name} as holiday`}
                              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                isAdded
                                  ? 'bg-emerald-50 border-emerald-200 cursor-default shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:shadow-md cursor-pointer'
                              }`}
                            >
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isAdded ? 'bg-emerald-100' : 'bg-rose-100'
                              }`}>
                                <PartyPopper className={`w-5 h-5 ${isAdded ? 'text-emerald-600' : 'text-rose-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-slate-800 truncate">{holiday.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {new Date(holiday.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              {isAdded && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Blocked / special dates list */}
                  <Card className="border-2 border-slate-200/80 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-100">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Blocked dates
                      </CardTitle>
                      <CardDescription>Dates when appointments cannot be scheduled (reflected in chatbot)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                      {availability.specialDates.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                          <CalendarDays className="w-14 h-14 mx-auto mb-3 text-slate-300" />
                          <p className="font-medium text-slate-600">No blocked dates yet</p>
                          <p className="text-sm mt-1">Add holidays above or mark dates as Unavailable in Calendar View</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availability.specialDates.map((sd, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-slate-200 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  sd.type === 'holiday' ? 'bg-rose-100' : 'bg-slate-200'
                                }`}>
                                  {sd.type === 'holiday' ? (
                                    <PartyPopper className="w-5 h-5 text-rose-600" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-slate-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{sd.name || 'Custom date'}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {new Date(sd.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSpecialDate(String(sd.date))}
                                title="Remove this date"
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 w-9 p-0 rounded-xl"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center gap-4 sm:justify-between mt-auto flex-shrink-0">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            {hasChanges && (
              <span className="flex items-center gap-2 animate-pulse font-bold text-amber-600 text-xs sm:text-sm bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <AlertCircle className="w-4 h-4" />
                Unsaved Changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="border-slate-300 hover:bg-slate-50 hover:text-slate-900 px-5 sm:px-6 rounded-xl transition-all duration-200 disabled:opacity-50 text-xs sm:text-sm font-bold h-10 sm:h-12 shadow-sm whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white shadow-xl shadow-indigo-200/40 border-0 px-6 sm:px-10 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none font-black text-xs sm:text-sm h-10 sm:h-12 whitespace-nowrap"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
