import React, { useState, useMemo, useEffect } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSafetyDrillData } from '../useSafetyDrillData';
import { useTimesheetData } from '../../staff/useTimesheetData';
import { SafetyDrill } from '../../../types';
import { ShieldAlert, Plus, Clock, Users, Timer, X, Trash2, UserCheck, Loader2, Search, Lock } from 'lucide-react';
import { LiveAttendanceRegister } from '../components/LiveAttendanceRegister';

const SafetyDrills: React.FC = () => {
  const { view_safety_drills } = usePermissions();
  const { drills, isLoading, addDrillLog, deleteDrillLog } = useSafetyDrillData();
  const { getCurrentlyClockedInStaff } = useTimesheetData();
  const [currentlyClockedIn, setCurrentlyClockedIn] = useState<string[]>([]);

  useEffect(() => {
    getCurrentlyClockedInStaff().then(setCurrentlyClockedIn);
  }, [getCurrentlyClockedInStaff]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDrill, setViewingDrill] = useState<SafetyDrill | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [drillType, setDrillType] = useState('Fire');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredDrills = useMemo(() => {
    return drills.filter(drill => {
      const matchesSearch = drill.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'ALL' || drill.title.includes(filterType);
      return matchesSearch && matchesFilter;
    });
  }, [drills, searchTerm, filterType]);

  if (!view_safety_drills) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Safety Drills. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verifiedNames = Object.entries(attendance).filter(([, accounted]) => accounted).map(([name]) => name).join(', ');
    const missingNames = Object.entries(attendance).filter(([, accounted]) => !accounted).map(([name]) => name).join(', ');

    await addDrillLog({
      date,
      title: `${drillType} Drill`,
      location: 'Site Wide',
      priority: 'High',
      status: 'Completed',
      description: JSON.stringify({
        time,
        duration,
        totalOnSite: currentlyClockedIn.length,
        verifiedNames,
        missingNames,
        performanceNotes: notes,
        attendance
      }),
      timestamp: new Date(`${date}T${time}`).getTime()
    });

    setIsModalOpen(false);
    setDuration('');
    setNotes('');
    setAttendance({});
  };

  const parseDrillDesc = (desc: string) => {
    try { return JSON.parse(desc); } catch { return { performanceNotes: desc, verifiedNames: '', totalOnSite: 0, time: '00:00', duration: '0' }; }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Safety Drills</h1>
          <p className="text-sm text-slate-500 mt-1">Statutory readiness audits and cross-referenced roll calls.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search drills..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          >
            <option value="ALL">All Types</option>
            <option value="Fire">Fire</option>
            <option value="Escape">Escape</option>
            <option value="Intruder">Intruder</option>
            <option value="Power">Power</option>
          </select>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-sm shrink-0">
            <Plus size={16}/> Log Drill Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filteredDrills.map(log => {
          const data = parseDrillDesc(log.description);
          const verifiedCount = data.verifiedNames ? data.verifiedNames.split(',').filter(Boolean).length : 0;
          const isFullyAccounted = verifiedCount >= data.totalOnSite && data.totalOnSite > 0;
          
          return (
            <div key={log.id} className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-all group shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isFullyAccounted ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{log.title}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isFullyAccounted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isFullyAccounted ? 'Accounted' : 'Discrepancy'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-0.5"><Clock size={12}/> {new Date(log.date).toLocaleDateString('en-GB')} @ {data.time}</span>
                      <span className="flex items-center gap-0.5"><Timer size={12}/> {data.duration}m Duration</span>
                      <span className="flex items-center gap-0.5"><Users size={12}/> {verifiedCount} / {data.totalOnSite} Cleared</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 max-w-lg">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">
                    {data.performanceNotes || "No performance notes recorded for this audit."}
                  </p>
                </div>

                <div className="flex items-center gap-1 self-end md:self-center">
                  <button onClick={() => setViewingDrill(log)} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 rounded-lg border border-slate-200 transition-all shadow-sm">
                    <UserCheck size={14}/> Roll Call
                  </button>
                  <button onClick={() => { deleteDrillLog(log.id) }} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 transition-all shadow-sm">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredDrills.length === 0 && (
          <div className="bg-white rounded-lg border border-dashed border-slate-300 py-8 text-center">
            <p className="text-xs font-bold text-slate-500">Nil Statutory Drill History</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Log Readiness Drill</h2>
                <p className="text-xs font-medium text-slate-500">Statutory Safety Audit</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5"><X size={16}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-3 space-y-3 overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Event Date</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass}/></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Alarm Trigger Time</label><input type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputClass}/></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Drill Classification</label>
                    <select value={drillType} onChange={e => setDrillType(e.target.value)} className={inputClass}>
                      <option value="Fire">Fire Evacuation</option>
                      <option value="Escape">Animal Escape Protocol</option>
                      <option value="Intruder">Security / Lockdown</option>
                      <option value="Power">Critical Utility Failure</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Evac Duration (Mins)</label><input type="number" required value={duration} onChange={e => setDuration(e.target.value)} className={inputClass}/></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-0.5">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><Users size={14}/> Active Staff Roll Call</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{Object.values(attendance).filter(Boolean).length} / {currentlyClockedIn.length} Present</span>
                </div>
                <LiveAttendanceRegister 
                  value={attendance} 
                  onChange={setAttendance} 
                  currentlyClockedIn={currentlyClockedIn}
                />
              </div>

              <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Performance Observations</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} resize-none h-16`} placeholder="Record readiness speed, compliance errors, or equipment issues..."/></div>
              
              <div className="pt-1">
                <button type="submit" className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">Commit & Seal Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDrill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Audit Details</h2>
                <p className="text-xs font-medium text-slate-500">Personnel Verification Report</p>
              </div>
              <button onClick={() => setViewingDrill(null)} className="text-slate-400 hover:text-slate-600 p-0.5"><X size={16}/></button>
            </div>
            <div className="p-3 space-y-3">
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-emerald-700">Accounted Personnel</h3>
                <div className="flex flex-wrap gap-1">
                  {parseDrillDesc(viewingDrill.description).verifiedNames.split(',').filter(Boolean).map((name: string) => (
                    <span key={name} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">{name}</span>
                  ))}
                  {!parseDrillDesc(viewingDrill.description).verifiedNames && <span className="text-xs text-slate-400 italic">None recorded</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-rose-700">Missing / Unaccounted</h3>
                <div className="flex flex-wrap gap-1">
                  {parseDrillDesc(viewingDrill.description).missingNames.split(',').filter(Boolean).map((name: string) => (
                    <span key={name} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-100">{name}</span>
                  ))}
                  {!parseDrillDesc(viewingDrill.description).missingNames && <span className="text-xs text-slate-400 italic">None recorded</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyDrills;
