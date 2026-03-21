import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List, Grid, Edit2, Trash2 } from 'lucide-react';
import { useRotaData } from './useRotaData';
import { useHolidayData } from './useHolidayData';
import AddShiftModal from './AddShiftModal';
import EditShiftModal from './EditShiftModal';
import { UserRole, Shift } from '../../types';

const StaffRota: React.FC = () => {
  const { shifts, deleteShift } = useRotaData();
  const { holidays } = useHolidayData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  const approvedHolidays = useMemo(() => 
    holidays.filter(h => h.status === 'Approved'), 
  [holidays]);

  const checkHolidayConflict = (staffName: string, shiftDate: string) => {
    const sDate = new Date(shiftDate).getTime();
    return approvedHolidays.some(h => {
      if (h.staff_name !== staffName) return false;
      const start = new Date(h.start_date).getTime();
      const end = new Date(h.end_date).getTime();
      return sDate >= start && sDate <= end;
    });
  };

  const handleDelete = async (shift: Shift) => {
    if (shift.pattern_id) {
      const delSeries = window.confirm('Do you want to delete the ENTIRE repeating series?\n\nClick OK to delete all.\nClick Cancel to delete ONLY this specific day.');
      await deleteShift(shift, delSeries);
    } else {
      if (window.confirm('Are you sure you want to delete this shift?')) {
        await deleteShift(shift, false);
      }
    }
  };

  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      const amount = direction === 'next' ? 1 : -1;
      if (viewMode === 'daily') d.setDate(d.getDate() + amount);
      if (viewMode === 'weekly') d.setDate(d.getDate() + (amount * 7));
      if (viewMode === 'monthly') d.setMonth(d.getMonth() + amount);
      return d;
    });
  };

  const filteredShifts = (shifts || []).filter(s => {
    if (roleFilter !== 'ALL' && s.user_role !== roleFilter) return false;
    return true;
  });

  const renderDailyView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayShifts = filteredShifts.filter(s => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">{currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        {dayShifts.length === 0 ? (
          <p className="text-slate-500">No shifts scheduled for this day.</p>
        ) : (
          <div className="space-y-4">
            {dayShifts.map(s => {
              const hasConflict = checkHolidayConflict(s.user_name, s.date);
              return (
                <div key={s.id} className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 ${hasConflict ? 'opacity-50 bg-red-50/50' : ''}`}>
                  <div className="w-24 text-center font-mono text-sm bg-slate-100 p-2 rounded">
                    {s.start_time} - {s.end_time}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg flex items-center gap-2">
                      {s.user_name}
                      {hasConflict && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">On Holiday</span>}
                    </p>
                    <p className="text-sm text-slate-600">{s.shift_type} • {s.user_role}</p>
                  </div>
                  {s.assigned_area && (
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                      {s.assigned_area}
                    </div>
                  )}
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setEditingShift(s)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const { start } = getWeekRange(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0];
          const dayShifts = filteredShifts.filter(s => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
          
          return (
            <div key={i} className="bg-white p-4 rounded-lg shadow min-h-[300px]">
              <h3 className="font-bold mb-3 pb-2 border-b text-center">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}<br/>
                <span className="text-sm text-slate-500 font-normal">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </h3>
              <div className="space-y-2">
                {dayShifts.map(s => {
                  const hasConflict = checkHolidayConflict(s.user_name, s.date);
                  return (
                    <div key={s.id} className={`bg-emerald-50 border border-emerald-100 p-2 rounded text-sm relative group ${hasConflict ? 'opacity-50 bg-red-50 border-red-200' : ''}`}>
                      <div className="flex justify-between items-start">
                        <p className={`font-bold ${hasConflict ? 'text-red-900' : 'text-emerald-900'}`}>
                          {s.user_name}
                        </p>
                        <div className="hidden group-hover:flex items-center gap-1 bg-white/80 rounded px-1 absolute top-1 right-1">
                          <button onClick={() => setEditingShift(s)} className="text-slate-400 hover:text-emerald-600 p-0.5">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="text-slate-400 hover:text-red-600 p-0.5">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {hasConflict && <p className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded uppercase tracking-wider font-bold inline-block mt-1">On Holiday</p>}
                      <p className={`${hasConflict ? 'text-red-700' : 'text-emerald-700'} text-xs mt-1`}>{s.shift_type}</p>
                      <p className="text-xs font-mono text-slate-600 mt-1">{s.start_time} - {s.end_time}</p>
                      {s.assigned_area && <span className={`inline-block mt-1 text-[10px] ${hasConflict ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'} px-1.5 py-0.5 rounded`}>{s.assigned_area}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const { start, end } = getMonthRange(currentDate);
    const startDay = start.getDay(); const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = end.getDate();
    
    const calendarDays = [];
    for (let i = 0; i < adjustedStartDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(start);
      d.setDate(i);
      calendarDays.push(d);
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-100 border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="p-2 text-center font-bold text-sm text-slate-600">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[100px]">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={i} className="border-b border-r bg-slate-50/50 p-2"></div>;
            
            const dateStr = day.toISOString().split('T')[0];
            const dayShifts = filteredShifts.filter(s => s.date === dateStr);
            
            return (
              <div key={i} className="border-b border-r p-1 overflow-y-auto">
                <div className="text-right text-xs text-slate-500 font-medium mb-1">{day.getDate()}</div>
                <div className="flex flex-wrap gap-1">
                  {dayShifts.map(s => {
                    const hasConflict = checkHolidayConflict(s.user_name, s.date);
                    return (
                      <div 
                        key={s.id} 
                        title={`${s.user_name} - ${s.shift_type} (${s.start_time}-${s.end_time})${hasConflict ? ' [ON HOLIDAY]' : ''}`}
                        className={`text-[9px] px-1 rounded truncate max-w-full flex items-center justify-between group cursor-pointer ${hasConflict ? 'bg-red-100 text-red-800 opacity-50' : 'bg-emerald-100 text-emerald-800'}`}
                      >
                        <span>{s.user_name.split(' ').map(n => n[0]).join('')}{hasConflict ? ' (H)' : ''}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingShift(s); }} className="hover:text-emerald-600"><Edit2 size={8} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="hover:text-red-600"><Trash2 size={8} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === 'daily') return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (viewMode === 'weekly') {
      const { start, end } = getWeekRange(currentDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Staff Rota</h1>
          <p className="text-sm text-slate-500 mt-1">Manage staff schedules and shifts</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
            className="border-slate-300 rounded-xl text-sm"
          >
            <option value="ALL">All Roles</option>
            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <div className="flex bg-white rounded-xl shadow-sm border p-1">
            <button onClick={() => setViewMode('daily')} className={`p-2 rounded-lg ${viewMode === 'daily' ? 'bg-slate-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`} title="Daily View"><List size={18} /></button>
            <button onClick={() => setViewMode('weekly')} className={`p-2 rounded-lg ${viewMode === 'weekly' ? 'bg-slate-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`} title="Weekly View"><Grid size={18} /></button>
            <button onClick={() => setViewMode('monthly')} className={`p-2 rounded-lg ${viewMode === 'monthly' ? 'bg-slate-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`} title="Monthly View"><CalendarIcon size={18} /></button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors ml-auto md:ml-0">
            <Plus size={16} /> Add Shift
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={() => navigateTime('prev')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-bold text-slate-800">{getHeaderTitle()}</h2>
        <button onClick={() => navigateTime('next')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {viewMode === 'daily' && renderDailyView()}
        {viewMode === 'weekly' && renderWeeklyView()}
        {viewMode === 'monthly' && renderMonthlyView()}
      </div>

      <AddShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditShiftModal key={editingShift?.id} isOpen={!!editingShift} onClose={() => setEditingShift(null)} existingShift={editingShift} />
    </div>
  );
};

export default StaffRota;
