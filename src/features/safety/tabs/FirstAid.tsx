import React, { useState, useMemo } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useFirstAidData } from '../useFirstAidData';
import { FirstAidLog } from '../../../types';
import { Plus, MapPin, Clock, X, Trash2, Loader2, Search, Lock } from 'lucide-react';

const FirstAid: React.FC = () => {
  const { view_first_aid } = usePermissions();
  const { logs, isLoading, addFirstAid, deleteFirstAid } = useFirstAidData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [person_name, setPersonName] = useState('');
  const [type, setType] = useState<'Injury' | 'Illness' | 'Near Miss'>('Injury');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [treatment, setTreatment] = useState('');
  const [outcome, setOutcome] = useState<FirstAidLog['outcome']>('Returned to Work');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (!view_first_aid) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view First Aid Log. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    await addFirstAid({
      date, time, person_name, type, description, treatment,
      location, outcome
    });
    setIsModalOpen(false);
    // Reset form
    setPersonName('');
    setDescription('');
    setTreatment('');
    setLocation('');
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
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">FIRST AID LOG</h1>
          <p className="text-sm text-slate-500 mt-1">Official first aid and safety event registry for personnel.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-sm shrink-0">
            <Plus size={16}/> Record Occurrence
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Entry Date</th>
                <th className="px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Subject Personnel</th>
                <th className="px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Occurrence Narrative</th>
                <th className="px-3 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Status / Outcome</th>
                <th className="px-3 py-2 text-xs font-bold text-slate-500 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="bg-white hover:bg-slate-50 transition-all group">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-bold text-slate-900 text-sm">{new Date(log.date).toLocaleDateString('en-GB')}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-0.5"><Clock size={12}/> {log.time}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900 block mb-0.5">{log.person_name}</span>
                    <div className="flex items-center gap-0.5 text-xs font-medium text-slate-500"><MapPin size={12}/> {log.location}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm line-clamp-2 italic border-l-2 border-slate-100 pl-2">"{log.description}"</p>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">ADMINISTERED: {log.treatment || 'Observation Only'}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      log.type === 'Injury' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                      log.type === 'Near Miss' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {log.type}
                    </span>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">{log.outcome}</div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { deleteFirstAid(log.id) }} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-md shadow-sm transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-xs font-medium text-slate-500">Nil Staff Health Registry History</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center">
              <div><h2 className="text-base font-bold text-slate-900">Record Occurrence</h2><p className="text-xs font-medium text-slate-500">Health & Safety Registry</p></div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-3 overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Subject Name</label><input type="text" required value={person_name} onChange={e => setPersonName(e.target.value)} className={inputClass} placeholder="Full Legal Name"/></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Classification</label>
                    <select value={type} onChange={e => setType(e.target.value as 'Injury' | 'Illness' | 'Near Miss')} className={inputClass}><option value="Injury">Injury</option><option value="Illness">Illness</option><option value="Near Miss">Near Miss</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Outcome</label>
                    <select value={outcome} onChange={e => setOutcome(e.target.value as FirstAidLog['outcome'])} className={inputClass}>
                      <option value="Returned to Work">Returned to Work</option>
                      <option value="Restricted Duties">Restricted Duties</option>
                      <option value="Monitoring">Monitoring (On Site)</option>
                      <option value="Sent Home">Sent Home</option>
                      <option value="GP Visit">GP / Medical Advice</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Ambulance Called">Ambulance Called</option>
                      <option value="Refused Treatment">Refused Treatment</option>
                      <option value="None">None / Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Event Location</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="e.g. Flight Arena"/></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Treatment Action</label><input type="text" value={treatment} onChange={e => setTreatment(e.target.value)} className={inputClass} placeholder="e.g. Wound Cleaned"/></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 mb-0.5">Full Incident Narrative</label><textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none h-16`} placeholder="Detailed account of what happened..."/></div>
              <button type="submit" className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">Commit to Registry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstAid;
