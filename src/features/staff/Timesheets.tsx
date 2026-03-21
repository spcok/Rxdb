import { useState } from 'react';
import { Plus, Calendar, Trash2, Lock } from 'lucide-react';
import { useTimesheetData } from './useTimesheetData';
import AddTimesheetModal from './AddTimesheetModal';
import { TimesheetStatus } from '@/src/types';
import { usePermissions } from '../../hooks/usePermissions';

export default function Timesheets() {
  const { submit_timesheets } = usePermissions();
  const { timesheets, deleteTimesheet } = useTimesheetData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!submit_timesheets) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold uppercase tracking-tight">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Staff Timesheets. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">TIME SHEETS</h1>
          <p className="text-sm text-slate-500 mt-1">Record of personnel presence and operational hours.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16}/> Record Attendance
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {(timesheets || []).map(timesheet => (
          <div key={timesheet.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-black text-xs border-2 border-white shadow-lg shrink-0">
                {String(timesheet.staff_name).split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{String(timesheet.staff_name)}</h3>
                <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                  <Calendar size={10}/> {String(timesheet.date)}
                </div>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center gap-8 w-full md:w-auto">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clock In</span>
                <span className="bg-slate-50 px-3 py-1.5 rounded-lg border-2 border-slate-100 font-mono text-xs font-black text-slate-600">
                  {String(timesheet.clock_in).includes('T') ? new Date(timesheet.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(timesheet.clock_in)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clock Out</span>
                <span className={`px-3 py-1.5 rounded-lg border-2 font-mono text-xs font-black ${timesheet.status === TimesheetStatus.ACTIVE ? 'bg-amber-50 border-amber-100 text-amber-600 italic' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  {timesheet.clock_out ? (String(timesheet.clock_out).includes('T') ? new Date(timesheet.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(timesheet.clock_out)) : '--:--'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                timesheet.status === TimesheetStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {String(timesheet.status)}
              </span>
              <button 
                onClick={() => deleteTimesheet(timesheet.id)}
                className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border-2 border-slate-100 transition-all"
                title="Delete Log"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        ))}
        {(timesheets || []).length === 0 && (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-24 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Nil Attendance Records Found</p>
          </div>
        )}
      </div>

      {isModalOpen && <AddTimesheetModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
