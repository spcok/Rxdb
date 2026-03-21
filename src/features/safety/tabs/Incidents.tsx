import React, { useState, useEffect } from 'react';
import { IncidentType, IncidentSeverity } from '../../../types';
import { usePermissions } from '../../../hooks/usePermissions';
import { useIncidentData } from '../useIncidentData';
import { useTimesheetData } from '../../staff/useTimesheetData';
import { Plus, Clock, X, AlertTriangle, MapPin, Trash2, Loader2, Search, Lock, Users } from 'lucide-react';
import { LiveAttendanceRegister } from '../components/LiveAttendanceRegister';

const Incidents: React.FC = () => {
  const { view_incidents } = usePermissions();
  const { 
    incidents, 
    isLoading, 
    searchTerm, 
    setSearchTerm, 
    filterSeverity, 
    setFilterSeverity, 
    addIncident, 
    deleteIncident 
  } = useIncidentData();
  const { getCurrentlyClockedInStaff } = useTimesheetData();
  const [currentlyClockedIn, setCurrentlyClockedIn] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCurrentlyClockedInStaff().then(setCurrentlyClockedIn);
  }, [getCurrentlyClockedInStaff]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<IncidentType>(IncidentType.OTHER);
  const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.MEDIUM);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  if (!view_incidents) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Incident Reports. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const incidentData = {
          date: new Date(date), 
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
          type: type, 
          severity, 
          description: type === IncidentType.FIRE ? JSON.stringify({ description, attendance }) : description,
          location: location || 'Site Wide', 
          status: 'Open', 
          reported_by: 'SYS',
      };

      try {
          // Close modal and reset form immediately for better UX
          setIsModalOpen(false);
          setDescription('');
          setLocation('');
          
          await addIncident(incidentData);
      } catch (error) {
          console.error("Failed to commit incident to ledger:", error);
          // If it failed critically, we might want to inform the user, 
          // but mutateOnlineFirst handles offline queuing automatically.
      }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400";

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Statutory Incident Log</h1>
                <p className="text-sm text-slate-500 mt-1">Compliance records for health, safety, and security events.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search incidents..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-sm shrink-0">
                    <Plus size={16}/> New Occurrence
                </button>
            </div>
        </div>

        <div className="flex flex-wrap gap-2">
            {(['ALL', ...Object.values(IncidentSeverity)] as const).map((s) => (
                <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterSeverity === s ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    {s}
                </button>
            ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-full overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">Timestamp</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">Event & Location</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">Official Narrative</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">Severity</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-500 text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {incidents.map((incident) => {
                            const isCritical = incident.severity === IncidentSeverity.CRITICAL || incident.severity === IncidentSeverity.HIGH;
                            const isMedium = incident.severity === IncidentSeverity.MEDIUM;
                            
                            return (
                                <tr key={incident.id} className="bg-white hover:bg-slate-50 transition-all group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-semibold text-slate-900 text-base">{new Date(incident.date).toLocaleDateString('en-GB')}</div>
                                        <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1"><Clock size={14}/> {incident.time}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-base font-semibold text-slate-900 block mb-1">{incident.type}</span>
                                        <div className="flex items-center gap-1 text-sm font-medium text-slate-500"><MapPin size={14}/> {incident.location}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-md line-clamp-2 italic border-l-2 border-slate-100 pl-3">"{incident.description}"</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                            isCritical ? 'bg-rose-100 text-rose-800' : 
                                            isMedium ? 'bg-amber-100 text-amber-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {isCritical && <AlertTriangle size={12} />}
                                            {incident.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { deleteIncident(incident.id) }} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-md shadow-sm transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {incidents.length === 0 && (
                             <tr><td colSpan={5} className="px-6 py-16 text-center text-sm font-medium text-slate-500">Nil Incident History</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div><h2 className="text-lg font-bold text-slate-900">New Occurrence</h2><p className="text-sm font-medium text-slate-500">Compliance Registry</p></div>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Event Date</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass}/></div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Classification</label>
                                    <select value={type} onChange={e => setType(e.target.value as IncidentType)} className={inputClass}>
                                        {Object.values(IncidentType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Occurrence Location</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="Site Area"/></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Risk Severity</label>
                                <select value={severity} onChange={e => setSeverity(e.target.value as IncidentSeverity)} className={inputClass}>
                                    {Object.values(IncidentSeverity).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Official Account / Description</label><textarea required value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none h-32`} placeholder="Detailed narrative..."/></div>
                        {type === IncidentType.FIRE && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Users size={16}/> Active Staff Roll Call</h3>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{Object.values(attendance).filter(Boolean).length} / {currentlyClockedIn.length} Present</span>
                                </div>
                                <LiveAttendanceRegister 
                                    value={attendance} 
                                    onChange={setAttendance} 
                                    currentlyClockedIn={currentlyClockedIn}
                                />
                            </div>
                        )}
                        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">Commit to Ledger</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Incidents;
